import { BUDGET_TOTAL } from '@/entities/players/model/player-selection.validation'

import { DEMO_CONFIG } from '@/shared/config/demo'
import type { DemoConfig } from '@/shared/config/demo'
import { Errors } from '@/shared/lib/http'

import { buildDemoSquad, demoEmail, hashSeed, pickDemoManagersForCompetition } from '../lib/demo-roster'
import { generateDemoGameweekScore } from '../lib/demo-score'

import type {
    IDemoCompetitionService,
    IEnsureDemoParticipantsResult,
    IProcessCompetitionsResult,
    IRecalculateAllResult,
    IRecalculateDemoScoresResult,
    IUpdateDemoScoresResult,
} from './demo-competition.service.interface'
import type { IDemoCompetitionRow, IDemoRepository } from '../repository/demo.repository.interface'

export class DemoCompetitionService implements IDemoCompetitionService {
    private readonly demoRepository: IDemoRepository
    private readonly config: DemoConfig

    constructor(demoRepository: IDemoRepository, config: DemoConfig = DEMO_CONFIG) {
        this.demoRepository = demoRepository
        this.config = config
    }

    async ensureDemoParticipants(competitionId: string): Promise<IEnsureDemoParticipantsResult> {
        const competition = await this.demoRepository.findCompetition(competitionId)

        if (!competition) throw Errors.notFound('Competition not found')

        const [realParticipants, demoTeams] = await Promise.all([
            this.demoRepository.countRealTeams(competitionId),
            this.demoRepository.findDemoTeams(competitionId),
        ])

        const result: IEnsureDemoParticipantsResult = {
            competitionId,
            realParticipants,
            demoParticipantsBefore: demoTeams.length,
            created: 0,
            skipped: 0,
        }

        if (!this.config.enabled) return result

        // Demo teams are never removed — a full or over-full competition is left alone
        // so historical standings stay valid when real users join late.
        const needed = this.config.targetParticipantCount - realParticipants - demoTeams.length

        if (needed <= 0) return result

        // Ask for existing + needed: the seeded ordering is stable, so the prefix
        // reproduces the managers already seeded and the tail is the new ones.
        const roster = pickDemoManagersForCompetition(competitionId, demoTeams.length + needed)

        const pool = await this.demoRepository.loadPlayerPool(
            competition.leagueSeasonId,
            competition.seasonYear,
        )

        if (pool.length === 0) {
            result.skipped = needed

            return result
        }

        for (const manager of roster) {
            if (result.created >= needed) break

            const user = await this.demoRepository.ensureDemoUser(
                demoEmail(manager.slug),
                manager.managerName,
            )

            const existingTeam = await this.demoRepository.findTeamByUserAndCompetition(
                user.id,
                competitionId,
            )

            if (existingTeam) continue

            const squad = buildDemoSquad(pool, hashSeed(`${competitionId}:${manager.slug}`))

            if (!squad) {
                result.skipped++
                continue
            }

            if (competition.leagueId && competition.leagueSeasonId) {
                await this.demoRepository.ensureMembership(
                    user.id,
                    competition.leagueId,
                    competition.leagueSeasonId,
                )
            }

            const cost = squad.reduce((sum, player) => sum + player.price, 0)

            await this.demoRepository.createDemoTeamWithSquad({
                userId: user.id,
                competitionId,
                name: manager.teamName,
                budgetLeft: Math.round((BUDGET_TOTAL - cost) * 10) / 10,
                players: squad,
            })

            result.created++
        }

        return result
    }

    async updateDemoScores(
        competitionId: string,
        options?: { includeUnfinished?: boolean },
    ): Promise<IUpdateDemoScoresResult> {
        const competition = await this.demoRepository.findCompetition(competitionId)

        if (!competition) throw Errors.notFound('Competition not found')

        const result: IUpdateDemoScoresResult = {
            competitionId,
            gameweeksConsidered: 0,
            rowsInserted: 0,
        }

        if (!this.config.enabled || competition.demoScoringFinalizedAt) return result

        const now = Date.now()
        const gameweeks = (
            await this.demoRepository.findGameweeksInRange(competition.startGameweek, competition.endGameweek)
        ).filter(
            (gameweek) =>
                options?.includeUnfinished || gameweek.isFinished || gameweek.endDate.getTime() <= now,
        )

        result.gameweeksConsidered = gameweeks.length

        if (gameweeks.length === 0) return result

        // Only demo teams — real squads are scored by the real pipeline and must
        // never be touched here.
        const demoTeams = await this.demoRepository.findDemoTeams(competitionId)

        if (demoTeams.length === 0) return result

        const existing = await this.demoRepository.findExistingPointsKeys(
            demoTeams.map((team) => team.id),
            gameweeks.map((gameweek) => gameweek.id),
        )

        const rows: { fantasyTeamId: string; gameweekId: string; points: number }[] = []

        for (const team of demoTeams) {
            for (const gameweek of gameweeks) {
                if (existing.has(`${team.id}:${gameweek.id}`)) continue

                rows.push({
                    fantasyTeamId: team.id,
                    gameweekId: gameweek.id,
                    points: generateDemoGameweekScore(team.id, gameweek.id),
                })
            }
        }

        // skipDuplicates + the (team, gameweek) unique index make a concurrent
        // double-run insert each row at most once, whatever the timing.
        result.rowsInserted = await this.demoRepository.insertGameweekPointsIfAbsent(rows)

        return result
    }

    /**
     * Re-derives demo points from scratch for one competition.
     *
     * Scores are a pure function of (teamId, gameweekId), so in the steady state
     * this only ever fills gaps — teams seeded after an earlier scoring run, or
     * gameweeks that have elapsed since. It also repairs rows whose stored value
     * no longer matches the function, which is how a partial write or a manual
     * edit gets healed. Finalized competitions are never touched.
     */
    async recalculateDemoScores(competitionId: string): Promise<IRecalculateDemoScoresResult> {
        const competition = await this.demoRepository.findCompetition(competitionId)

        if (!competition) throw Errors.notFound('Competition not found')

        const result: IRecalculateDemoScoresResult = {
            competitionId,
            gameweeksConsidered: 0,
            inserted: 0,
            corrected: 0,
            unchanged: 0,
            pruned: 0,
            skippedFinalized: false,
        }

        if (!this.config.enabled) return result

        if (competition.demoScoringFinalizedAt) {
            result.skippedFinalized = true

            return result
        }

        // A widened or shifted window leaves demo points stranded outside it. They
        // are invisible to the leaderboard but would resurface if the window ever
        // moved back, so clear them as part of re-deriving the truth.
        result.pruned = await this.demoRepository.deleteDemoPointsOutsideRange(
            competitionId,
            competition.startGameweek,
            competition.endGameweek,
        )

        const now = Date.now()
        const gameweeks = (
            await this.demoRepository.findGameweeksInRange(competition.startGameweek, competition.endGameweek)
        ).filter((gameweek) => gameweek.isFinished || gameweek.endDate.getTime() <= now)

        result.gameweeksConsidered = gameweeks.length

        if (gameweeks.length === 0) return result

        const demoTeams = await this.demoRepository.findDemoTeams(competitionId)

        if (demoTeams.length === 0) return result

        const teamIds = demoTeams.map((team) => team.id)
        const gameweekIds = gameweeks.map((gameweek) => gameweek.id)
        const stored = await this.demoRepository.findPointsByKey(teamIds, gameweekIds)

        const toInsert: { fantasyTeamId: string; gameweekId: string; points: number }[] = []
        const toUpdate: { fantasyTeamId: string; gameweekId: string; points: number }[] = []

        for (const team of demoTeams) {
            for (const gameweek of gameweeks) {
                const expected = generateDemoGameweekScore(team.id, gameweek.id)
                const current = stored.get(`${team.id}:${gameweek.id}`)

                if (current === undefined) {
                    toInsert.push({ fantasyTeamId: team.id, gameweekId: gameweek.id, points: expected })
                } else if (current !== expected) {
                    toUpdate.push({ fantasyTeamId: team.id, gameweekId: gameweek.id, points: expected })
                } else {
                    result.unchanged++
                }
            }
        }

        result.inserted = await this.demoRepository.insertGameweekPointsIfAbsent(toInsert)
        result.corrected = await this.demoRepository.updateGameweekPoints(toUpdate)

        return result
    }

    async recalculateAllDemoScores(): Promise<IRecalculateAllResult> {
        const result: IRecalculateAllResult = {
            competitions: 0,
            inserted: 0,
            corrected: 0,
            unchanged: 0,
            pruned: 0,
            skippedFinalized: 0,
            errors: [],
        }

        if (!this.config.enabled) return result

        const competitions = await this.demoRepository.findCompetitionsForProcessing()

        for (const competition of competitions) {
            try {
                const recalculated = await this.recalculateDemoScores(competition.id)

                result.competitions++
                result.inserted += recalculated.inserted
                result.corrected += recalculated.corrected
                result.unchanged += recalculated.unchanged
                result.pruned += recalculated.pruned

                if (recalculated.skippedFinalized) result.skippedFinalized++
            } catch (error) {
                result.errors.push(
                    `${competition.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                )
            }
        }

        return result
    }

    async processCompetitions(): Promise<IProcessCompetitionsResult> {
        const result: IProcessCompetitionsResult = {
            processed: 0,
            participantsCreated: 0,
            scoreRowsInserted: 0,
            finalized: 0,
            errors: [],
        }

        if (!this.config.enabled) return result

        const competitions = await this.demoRepository.findCompetitionsForProcessing()

        for (const competition of competitions) {
            try {
                result.processed++

                const seeded = await this.ensureDemoParticipants(competition.id)

                result.participantsCreated += seeded.created

                if (competition.status === 'active') {
                    const scored = await this.updateDemoScores(competition.id)

                    result.scoreRowsInserted += scored.rowsInserted
                }

                if (competition.status === 'completed') {
                    result.scoreRowsInserted += await this.finalizeCompetition(competition)
                    result.finalized++
                }
            } catch (error) {
                result.errors.push(
                    `${competition.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                )
            }
        }

        return result
    }

    /**
     * A finished competition gets every remaining gameweek scored — including any
     * never marked finished — then the finalized timestamp locks it out of all
     * future runs. Standings are derived from the persisted rows, so they cannot
     * drift once no new rows can be written.
     */
    private async finalizeCompetition(competition: IDemoCompetitionRow): Promise<number> {
        if (competition.demoScoringFinalizedAt) return 0

        const scored = await this.updateDemoScores(competition.id, { includeUnfinished: true })

        await this.demoRepository.markDemoScoringFinalized(competition.id)

        return scored.rowsInserted
    }
}

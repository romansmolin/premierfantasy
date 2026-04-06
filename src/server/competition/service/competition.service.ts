import type {
    ICompetition,
    ICompetitionState,
    ICreateCompetition,
    ILeaderboard,
} from '@/entities/competition/model/competition.types'

import type { ICompetitionService } from './competition.service.interface'
import type { ICompetitionRepository } from '../repository/competition.repository.interface'
import type { IFantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository.interface'
import type { IGameweekRepository } from '@/server/gameweek/repository/gameweek.repository.interface'
import type { IWalletService } from '@/server/wallet/service/wallet.service.interface'

const ROLLING_WINDOW = 5

export class CompetitionService implements ICompetitionService {
    private readonly competitionRepository
    private readonly fantasyTeamRepository
    private readonly gameweekRepository
    private readonly walletService

    constructor(
        competitionRepository: ICompetitionRepository,
        fantasyTeamRepository?: IFantasyTeamRepository,
        gameweekRepository?: IGameweekRepository,
        walletService?: IWalletService,
    ) {
        this.competitionRepository = competitionRepository
        this.fantasyTeamRepository = fantasyTeamRepository ?? null
        this.gameweekRepository = gameweekRepository ?? null
        this.walletService = walletService ?? null
    }

    async getCompetition(id: string): Promise<ICompetition | null> {
        return this.competitionRepository.findById(id)
    }

    async getAllCompetitions(): Promise<ICompetition[]> {
        return this.competitionRepository.findAll()
    }

    async createCompetition(data: ICreateCompetition): Promise<ICompetition> {
        return this.competitionRepository.create(data)
    }

    async updateCompetition(id: string, data: Partial<ICreateCompetition>): Promise<ICompetition> {
        return this.competitionRepository.update(id, data)
    }

    async deleteCompetition(id: string): Promise<void> {
        return this.competitionRepository.delete(id)
    }

    async getLeaderboard(competitionId: string): Promise<ILeaderboard> {
        const competition = await this.competitionRepository.findById(competitionId)

        if (!competition) throw new Error('Competition not found')

        const entries = await this.competitionRepository.getLeaderboard(competitionId)

        return {
            competitionId: competition.id,
            competitionName: competition.name,
            currentGameweek: competition.endGameweek,
            entries,
        }
    }

    async getActiveCompetition(): Promise<ICompetition | null> {
        return this.competitionRepository.findActive()
    }

    async getUpcomingCompetition(): Promise<ICompetition | null> {
        return this.competitionRepository.findUpcoming()
    }

    async getCompetitionState(userId: string): Promise<ICompetitionState> {
        if (!this.fantasyTeamRepository) {
            throw new Error('FantasyTeamRepository is required for getCompetitionState')
        }

        const [active, upcoming] = await Promise.all([
            this.competitionRepository.findActive(),
            this.competitionRepository.findUpcoming(),
        ])

        const [activeTeam, upcomingTeam] = await Promise.all([
            active ? this.fantasyTeamRepository.findByUserAndCompetition(userId, active.id) : null,
            upcoming ? this.fantasyTeamRepository.findByUserAndCompetition(userId, upcoming.id) : null,
        ])

        const hasTeamInActive = !!activeTeam
        const hasTeamInUpcoming = !!upcomingTeam

        const now = new Date()
        const canJoinActive =
            !!active && !hasTeamInActive && !!active.joinDeadline && now < new Date(active.joinDeadline)
        const canJoinUpcoming = !!upcoming && !hasTeamInUpcoming

        let userRankInActive: number | null = null
        let userPointsInActive: number | null = null

        if (active && hasTeamInActive) {
            const entries = await this.competitionRepository.getLeaderboard(active.id)
            const userEntry = entries.find((e) => e.userId === userId)

            if (userEntry) {
                userRankInActive = userEntry.rank
                userPointsInActive = userEntry.totalPoints
            }
        }

        return {
            activeCompetition: active,
            upcomingCompetition: upcoming,
            hasTeamInActive,
            hasTeamInUpcoming,
            canJoinActive,
            canJoinUpcoming,
            userRankInActive,
            userPointsInActive,
        }
    }

    async generateRollingCompetitions(totalGameweeks: number): Promise<void> {
        if (!this.gameweekRepository) {
            throw new Error('GameweekRepository is required for generateRollingCompetitions')
        }

        const chunks: { start: number; end: number }[] = []

        for (let gw = 1; gw <= totalGameweeks; gw += ROLLING_WINDOW) {
            const end = Math.min(gw + ROLLING_WINDOW - 1, totalGameweeks)

            chunks.push({ start: gw, end })
        }

        const activeGw = await this.gameweekRepository.findActive()
        let currentGwNumber = activeGw?.number ?? 0

        if (!currentGwNumber) {
            // No active GW — find the next unfinished one
            const allGws = await this.gameweekRepository.findAll()
            const nextUnfinished = allGws
                .filter((gw) => !gw.isFinished)
                .sort((a, b) => a.number - b.number)[0]

            currentGwNumber = nextUnfinished?.number ?? 1
        }

        for (const chunk of chunks) {
            const existing = await this.competitionRepository.findByGameweekRange(chunk.start, chunk.end)

            if (existing) continue

            const startGw = await this.gameweekRepository.findByNumber(chunk.start)
            const joinDeadline = startGw?.startDate ?? undefined

            let status = 'upcoming'

            if (currentGwNumber >= chunk.start && currentGwNumber <= chunk.end) {
                status = 'active'
            } else if (chunk.end < currentGwNumber) {
                status = 'completed'
            }

            await this.competitionRepository.create({
                name: `GW${chunk.start}–GW${chunk.end}`,
                startGameweek: chunk.start,
                endGameweek: chunk.end,
                joinDeadline,
            })

            const created = await this.competitionRepository.findByGameweekRange(chunk.start, chunk.end)

            if (created && status !== 'upcoming') {
                await this.competitionRepository.updateStatus(created.id, status)
            }
        }

        // Sync statuses of all existing competitions
        const allCompetitions = await this.competitionRepository.findAll()

        for (const comp of allCompetitions) {
            const endGw = this.gameweekRepository
                ? await this.gameweekRepository.findByNumber(comp.endGameweek)
                : null
            const startGw = this.gameweekRepository
                ? await this.gameweekRepository.findByNumber(comp.startGameweek)
                : null

            let expectedStatus = 'upcoming'

            if (endGw?.isFinished) {
                expectedStatus = 'completed'
            } else if (
                startGw &&
                currentGwNumber >= comp.startGameweek &&
                currentGwNumber <= comp.endGameweek
            ) {
                expectedStatus = 'active'
            }

            if (comp.status !== expectedStatus) {
                await this.competitionRepository.updateStatus(comp.id, expectedStatus)
            }
        }
    }

    async transitionCompetitions(): Promise<void> {
        if (!this.gameweekRepository) {
            throw new Error('GameweekRepository is required for transitionCompetitions')
        }

        const active = await this.competitionRepository.findActive()

        if (active) {
            const endGw = await this.gameweekRepository.findByNumber(active.endGameweek)

            if (endGw?.isFinished) {
                await this.competitionRepository.updateStatus(active.id, 'completed')

                if (this.walletService) {
                    const entries = await this.competitionRepository.getLeaderboard(active.id)
                    const top3 = entries.filter((e) => e.rank <= 3)

                    for (const entry of top3) {
                        await this.walletService.awardCompetitionReward(entry.userId, active.id, entry.rank)
                    }
                }
            } else {
                return
            }
        }

        const upcoming = await this.competitionRepository.findUpcoming()

        if (upcoming) {
            await this.competitionRepository.updateStatus(upcoming.id, 'active')
        }
    }
}

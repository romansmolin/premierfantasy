import type {
    IJoinLeagueResult,
    ILeagueParticipant,
    IMyLeague,
    IMyLeagueCompetition,
} from '@/entities/league/model/league-membership.types'

import { Errors } from '@/shared/lib/http'

import type { ILeagueMembershipService } from './league-membership.service.interface'
import type { ILeagueMembershipRepository } from '../repository/league-membership.repository.interface'
import type {
    ICompetitionRepository,
    ICompetitionBrowserRow,
} from '@/server/competition/repository/competition.repository.interface'
import type { IFantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository.interface'
import type { ILeagueRepository } from '@/server/league/repository/league.repository.interface'

const SQUAD_SIZE = 11

const toCompetition = (row: ICompetitionBrowserRow): IMyLeagueCompetition => ({
    id: row.id,
    name: row.name,
    startGameweek: row.startGameweek,
    endGameweek: row.endGameweek,
    status: row.status,
    joinDeadline: row.joinDeadline?.toISOString() ?? null,
})

export class LeagueMembershipService implements ILeagueMembershipService {
    private readonly membershipRepository: ILeagueMembershipRepository
    private readonly leagueRepository: ILeagueRepository
    private readonly competitionRepository: ICompetitionRepository
    private readonly fantasyTeamRepository: IFantasyTeamRepository

    constructor(
        membershipRepository: ILeagueMembershipRepository,
        leagueRepository: ILeagueRepository,
        competitionRepository: ICompetitionRepository,
        fantasyTeamRepository: IFantasyTeamRepository,
    ) {
        this.membershipRepository = membershipRepository
        this.leagueRepository = leagueRepository
        this.competitionRepository = competitionRepository
        this.fantasyTeamRepository = fantasyTeamRepository
    }

    async joinLeague(userId: string, leagueId: string): Promise<IJoinLeagueResult> {
        const league = await this.leagueRepository.findById(leagueId)

        if (!league) throw Errors.notFound('League not found')

        const season = await this.leagueRepository.findJoinableSeason(leagueId, new Date())

        if (!season) {
            throw Errors.unprocessable(`${league.name} has no season open for joining yet`)
        }

        const existing = await this.membershipRepository.findByUserAndSeason(userId, season.id)

        const membership =
            existing ??
            (await this.membershipRepository.upsert({
                userId,
                leagueId,
                leagueSeasonId: season.id,
            }))

        return {
            membershipId: membership.id,
            leagueId,
            leagueSeasonId: season.id,
            seasonYear: season.year,
            alreadyMember: !!existing,
        }
    }

    async getMyLeagues(userId: string): Promise<IMyLeague[]> {
        const memberships = await this.membershipRepository.findByUser(userId)

        if (memberships.length === 0) return []

        const seasonIds = memberships.map((m) => m.leagueSeasonId)
        const [competitions, participantCounts] = await Promise.all([
            this.competitionRepository.findByLeagueSeasonIds(seasonIds),
            this.membershipRepository.countsByLeagueSeasonIds(seasonIds),
        ])

        const teams = await this.fantasyTeamRepository.findSummariesByUserAndCompetitions(
            userId,
            competitions.map((c) => c.id),
        )
        const teamByCompetition = new Map(teams.map((t) => [t.competitionId, t]))
        const standings = await this.competitionRepository.getUserStandings(
            userId,
            teams.map((t) => t.competitionId),
        )

        const competitionsBySeason = new Map<string, ICompetitionBrowserRow[]>()

        for (const competition of competitions) {
            if (!competition.leagueSeasonId) continue

            const list = competitionsBySeason.get(competition.leagueSeasonId) ?? []

            list.push(competition)
            competitionsBySeason.set(competition.leagueSeasonId, list)
        }

        return memberships.map((membership) => {
            const seasonCompetitions = competitionsBySeason.get(membership.leagueSeasonId) ?? []
            const active = seasonCompetitions.find((c) => c.status === 'active') ?? null
            const upcoming = seasonCompetitions.find((c) => c.status === 'upcoming') ?? null
            const current = active ?? upcoming
            const team = current ? (teamByCompetition.get(current.id) ?? null) : null

            return {
                membershipId: membership.id,
                joinedAt: membership.joinedAt.toISOString(),
                league: membership.league,
                season: {
                    id: membership.season.id,
                    year: membership.season.year,
                    startDate: membership.season.startDate.toISOString(),
                    endDate: membership.season.endDate.toISOString(),
                },
                activeCompetition: active ? toCompetition(active) : null,
                nextCompetition: upcoming ? toCompetition(upcoming) : null,
                fantasyTeam: team
                    ? {
                          id: team.id,
                          name: team.name,
                          competitionId: team.competitionId,
                          playerCount: team.playerCount,
                          isComplete: team.playerCount === SQUAD_SIZE,
                          rank: standings.get(team.competitionId)?.rank ?? null,
                          totalPoints: standings.get(team.competitionId)?.totalPoints ?? null,
                      }
                    : null,
                participantCount: participantCounts.get(membership.leagueSeasonId) ?? 1,
            }
        })
    }

    async joinCompetition(userId: string, competitionId: string): Promise<void> {
        const context = await this.competitionRepository.findLeagueContext(competitionId)

        if (!context) throw Errors.notFound('Competition not found')

        if (context.status === 'completed') {
            throw Errors.unprocessable(`${context.name} has already finished`)
        }

        if (context.joinDeadline && context.joinDeadline.getTime() <= Date.now()) {
            throw Errors.unprocessable(`The join window for ${context.name} has closed`)
        }

        // Legacy competitions predate the league tree and carry no season to join.
        if (!context.leagueSeasonId || !context.leagueId) return

        await this.membershipRepository.upsert({
            userId,
            leagueId: context.leagueId,
            leagueSeasonId: context.leagueSeasonId,
        })
    }

    async getParticipants(leagueSeasonId: string): Promise<ILeagueParticipant[]> {
        const memberships = await this.membershipRepository.listBySeason(leagueSeasonId)

        return memberships.map((m) => ({
            membershipId: m.id,
            userId: m.userId,
            userName: m.user.name,
            joinedAt: m.joinedAt.toISOString(),
        }))
    }
}

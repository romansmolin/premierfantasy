import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppError } from '@/shared/lib/http'

import { LeagueMembershipService } from './league-membership.service'

import type {
    ILeagueMembershipRepository,
    ILeagueMembershipRow,
    IMembershipWithLeagueRow,
} from '../repository/league-membership.repository.interface'
import type {
    ICompetitionRepository,
    ICompetitionBrowserRow,
} from '@/server/competition/repository/competition.repository.interface'
import type { IFantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository.interface'
import type { ILeagueRepository } from '@/server/league/repository/league.repository.interface'

const LEAGUE = {
    id: 'league-1',
    externalId: 39,
    name: 'Premier League',
    country: 'England',
    logo: null,
    type: 'League',
    seasonStartMonth: 8,
}

const SEASON = {
    id: 'season-1',
    leagueId: 'league-1',
    year: 2026,
    startDate: new Date('2026-08-01'),
    endDate: new Date('2027-05-31'),
    isCurrent: true,
}

const membershipRow = (overrides: Partial<ILeagueMembershipRow> = {}): ILeagueMembershipRow => ({
    id: 'membership-1',
    userId: 'user-1',
    leagueId: LEAGUE.id,
    leagueSeasonId: SEASON.id,
    isDemo: false,
    joinedAt: new Date('2026-08-10'),
    ...overrides,
})

const membershipWithLeague = (
    overrides: Partial<IMembershipWithLeagueRow> = {},
): IMembershipWithLeagueRow => ({
    ...membershipRow(),
    league: {
        id: LEAGUE.id,
        externalId: LEAGUE.externalId,
        name: LEAGUE.name,
        country: LEAGUE.country,
        logo: LEAGUE.logo,
        type: LEAGUE.type,
    },
    season: SEASON,
    user: { id: 'user-1', name: 'Real Manager', isDemo: false },
    ...overrides,
})

const competitionRow = (overrides: Partial<ICompetitionBrowserRow> = {}): ICompetitionBrowserRow => ({
    id: 'comp-1',
    name: 'PL GW1-5',
    startGameweek: 1,
    endGameweek: 5,
    status: 'active',
    joinDeadline: new Date('2026-08-15'),
    createdAt: new Date('2026-07-01'),
    leagueSeasonId: SEASON.id,
    league: { id: LEAGUE.id, name: LEAGUE.name, country: LEAGUE.country, logo: null, type: 'League' },
    ...overrides,
})

const makeDeps = () => {
    const membershipRepository = {
        findByUser: vi.fn<ILeagueMembershipRepository['findByUser']>().mockResolvedValue([]),
        findByUserAndSeason: vi
            .fn<ILeagueMembershipRepository['findByUserAndSeason']>()
            .mockResolvedValue(null),
        upsert: vi.fn<ILeagueMembershipRepository['upsert']>().mockResolvedValue(membershipRow()),
        countsByLeagueSeasonIds: vi
            .fn<ILeagueMembershipRepository['countsByLeagueSeasonIds']>()
            .mockResolvedValue(new Map()),
        listBySeason: vi.fn<ILeagueMembershipRepository['listBySeason']>().mockResolvedValue([]),
        delete: vi.fn<ILeagueMembershipRepository['delete']>().mockResolvedValue(undefined),
    }

    const leagueRepository = {
        findById: vi.fn().mockResolvedValue(LEAGUE),
        findJoinableSeason: vi.fn().mockResolvedValue(SEASON),
        findActiveLeagues: vi.fn(),
        findSeasonsByLeagueIds: vi.fn(),
        findPublicCompetitionsByLeagueSeasonIds: vi.fn(),
        findInProgressSeasons: vi.fn(),
        isLeagueByExternalId: vi.fn(),
    } as unknown as ILeagueRepository & {
        findById: ReturnType<typeof vi.fn>
        findJoinableSeason: ReturnType<typeof vi.fn>
    }

    const competitionRepository = {
        findByLeagueSeasonIds: vi.fn().mockResolvedValue([]),
        getUserStandings: vi.fn().mockResolvedValue(new Map()),
        findLeagueContext: vi.fn().mockResolvedValue({
            id: 'comp-1',
            name: 'PL GW1-5',
            status: 'active',
            joinDeadline: new Date(Date.now() + 86_400_000),
            leagueSeasonId: SEASON.id,
            leagueId: LEAGUE.id,
        }),
    } as unknown as ICompetitionRepository & {
        findByLeagueSeasonIds: ReturnType<typeof vi.fn>
        findLeagueContext: ReturnType<typeof vi.fn>
        getUserStandings: ReturnType<typeof vi.fn>
    }

    const fantasyTeamRepository = {
        findSummariesByUserAndCompetitions: vi.fn().mockResolvedValue([]),
    } as unknown as IFantasyTeamRepository & {
        findSummariesByUserAndCompetitions: ReturnType<typeof vi.fn>
    }

    const service = new LeagueMembershipService(
        membershipRepository as unknown as ILeagueMembershipRepository,
        leagueRepository,
        competitionRepository,
        fantasyTeamRepository,
    )

    return { service, membershipRepository, leagueRepository, competitionRepository, fantasyTeamRepository }
}

const statusOf = async (promise: Promise<unknown>): Promise<number> => {
    try {
        await promise

        throw new Error('expected the call to reject')
    } catch (error) {
        return (error as AppError).statusCode
    }
}

describe('LeagueMembershipService.joinLeague', () => {
    let deps: ReturnType<typeof makeDeps>

    beforeEach(() => {
        deps = makeDeps()
    })

    it('creates a membership for the joinable season', async () => {
        const result = await deps.service.joinLeague('user-1', 'league-1')

        expect(deps.membershipRepository.upsert).toHaveBeenCalledWith({
            userId: 'user-1',
            leagueId: 'league-1',
            leagueSeasonId: 'season-1',
        })
        expect(result).toMatchObject({
            leagueSeasonId: 'season-1',
            seasonYear: 2026,
            alreadyMember: false,
        })
    })

    it('is idempotent — joining twice does not write a second membership', async () => {
        deps.membershipRepository.findByUserAndSeason.mockResolvedValue(membershipRow())

        const result = await deps.service.joinLeague('user-1', 'league-1')

        expect(deps.membershipRepository.upsert).not.toHaveBeenCalled()
        expect(result.alreadyMember).toBe(true)
        expect(result.membershipId).toBe('membership-1')
    })

    it('404s for an unknown league', async () => {
        deps.leagueRepository.findById.mockResolvedValue(null)

        await expect(statusOf(deps.service.joinLeague('user-1', 'nope'))).resolves.toBe(404)
    })

    it('422s when the league has no season open to join', async () => {
        deps.leagueRepository.findJoinableSeason.mockResolvedValue(null)

        await expect(statusOf(deps.service.joinLeague('user-1', 'league-1'))).resolves.toBe(422)
    })
})

describe('LeagueMembershipService.getMyLeagues', () => {
    let deps: ReturnType<typeof makeDeps>

    beforeEach(() => {
        deps = makeDeps()
    })

    it('returns an empty list when the user has joined nothing', async () => {
        await expect(deps.service.getMyLeagues('user-1')).resolves.toEqual([])
    })

    it('returns the joined league with its live competition and squad progress', async () => {
        deps.membershipRepository.findByUser.mockResolvedValue([membershipWithLeague()])
        deps.competitionRepository.findByLeagueSeasonIds.mockResolvedValue([
            competitionRow(),
            competitionRow({ id: 'comp-2', status: 'upcoming', startGameweek: 6, endGameweek: 10 }),
        ])
        deps.membershipRepository.countsByLeagueSeasonIds.mockResolvedValue(new Map([['season-1', 6]]))
        deps.fantasyTeamRepository.findSummariesByUserAndCompetitions.mockResolvedValue([
            {
                id: 'team-1',
                name: 'My Team',
                competitionId: 'comp-1',
                budgetLeft: 2.5,
                isDemo: false,
                playerCount: 7,
            },
        ])

        const [league] = await deps.service.getMyLeagues('user-1')

        expect(league.league.name).toBe('Premier League')
        expect(league.activeCompetition?.id).toBe('comp-1')
        expect(league.nextCompetition?.id).toBe('comp-2')
        expect(league.participantCount).toBe(6)
        expect(league.fantasyTeam).toMatchObject({ id: 'team-1', playerCount: 7, isComplete: false })
    })

    it('attaches rank and points from the competition standings', async () => {
        deps.membershipRepository.findByUser.mockResolvedValue([membershipWithLeague()])
        deps.competitionRepository.findByLeagueSeasonIds.mockResolvedValue([competitionRow()])
        deps.fantasyTeamRepository.findSummariesByUserAndCompetitions.mockResolvedValue([
            {
                id: 'team-1',
                name: 'My Team',
                competitionId: 'comp-1',
                budgetLeft: 0,
                isDemo: false,
                playerCount: 11,
            },
        ])
        deps.competitionRepository.getUserStandings.mockResolvedValue(
            new Map([['comp-1', { rank: 2, totalPoints: 87, participants: 6 }]]),
        )

        const [league] = await deps.service.getMyLeagues('user-1')

        expect(league.fantasyTeam).toMatchObject({ rank: 2, totalPoints: 87 })
    })

    it('leaves rank null before any gameweek has scored', async () => {
        deps.membershipRepository.findByUser.mockResolvedValue([membershipWithLeague()])
        deps.competitionRepository.findByLeagueSeasonIds.mockResolvedValue([competitionRow()])
        deps.fantasyTeamRepository.findSummariesByUserAndCompetitions.mockResolvedValue([
            {
                id: 'team-1',
                name: 'My Team',
                competitionId: 'comp-1',
                budgetLeft: 0,
                isDemo: false,
                playerCount: 11,
            },
        ])

        const [league] = await deps.service.getMyLeagues('user-1')

        expect(league.fantasyTeam).toMatchObject({ rank: null, totalPoints: null })
    })

    it('marks a full squad as complete', async () => {
        deps.membershipRepository.findByUser.mockResolvedValue([membershipWithLeague()])
        deps.competitionRepository.findByLeagueSeasonIds.mockResolvedValue([competitionRow()])
        deps.fantasyTeamRepository.findSummariesByUserAndCompetitions.mockResolvedValue([
            {
                id: 'team-1',
                name: 'My Team',
                competitionId: 'comp-1',
                budgetLeft: 0,
                isDemo: false,
                playerCount: 11,
            },
        ])

        const [league] = await deps.service.getMyLeagues('user-1')

        expect(league.fantasyTeam?.isComplete).toBe(true)
    })
})

describe('LeagueMembershipService.joinCompetition', () => {
    let deps: ReturnType<typeof makeDeps>

    beforeEach(() => {
        deps = makeDeps()
    })

    it('records the membership behind the competition', async () => {
        await deps.service.joinCompetition('user-1', 'comp-1')

        expect(deps.membershipRepository.upsert).toHaveBeenCalledWith({
            userId: 'user-1',
            leagueId: 'league-1',
            leagueSeasonId: 'season-1',
        })
    })

    it('404s for an unknown competition', async () => {
        deps.competitionRepository.findLeagueContext.mockResolvedValue(null)

        await expect(statusOf(deps.service.joinCompetition('user-1', 'ghost'))).resolves.toBe(404)
    })

    it('422s once the join deadline has passed', async () => {
        deps.competitionRepository.findLeagueContext.mockResolvedValue({
            id: 'comp-1',
            name: 'PL GW1-5',
            status: 'active',
            joinDeadline: new Date(Date.now() - 1000),
            leagueSeasonId: SEASON.id,
            leagueId: LEAGUE.id,
        })

        await expect(statusOf(deps.service.joinCompetition('user-1', 'comp-1'))).resolves.toBe(422)
        expect(deps.membershipRepository.upsert).not.toHaveBeenCalled()
    })

    it('422s for a finished competition', async () => {
        deps.competitionRepository.findLeagueContext.mockResolvedValue({
            id: 'comp-1',
            name: 'PL GW1-5',
            status: 'completed',
            joinDeadline: null,
            leagueSeasonId: SEASON.id,
            leagueId: LEAGUE.id,
        })

        await expect(statusOf(deps.service.joinCompetition('user-1', 'comp-1'))).resolves.toBe(422)
    })

    it('skips legacy competitions that carry no league season', async () => {
        deps.competitionRepository.findLeagueContext.mockResolvedValue({
            id: 'legacy',
            name: 'Legacy',
            status: 'active',
            joinDeadline: null,
            leagueSeasonId: null,
            leagueId: null,
        })

        await expect(deps.service.joinCompetition('user-1', 'legacy')).resolves.toBeUndefined()
        expect(deps.membershipRepository.upsert).not.toHaveBeenCalled()
    })
})

describe('LeagueMembershipService.getParticipants', () => {
    it('lists demo and real managers alike, without exposing which is which', async () => {
        const deps = makeDeps()

        deps.membershipRepository.listBySeason.mockResolvedValue([
            membershipWithLeague(),
            membershipWithLeague({
                id: 'membership-2',
                userId: 'demo-1',
                isDemo: true,
                user: { id: 'demo-1', name: 'Alex Berzins', isDemo: true },
            }),
        ])

        const participants = await deps.service.getParticipants('season-1')

        expect(participants).toHaveLength(2)
        expect(participants[0]).toMatchObject({ userName: 'Real Manager' })
        expect(participants[1]).toMatchObject({ userName: 'Alex Berzins' })

        // The demo/real distinction stays server-side — it must not reach the client.
        for (const participant of participants) {
            expect(participant).not.toHaveProperty('isDemo')
        }
    })
})

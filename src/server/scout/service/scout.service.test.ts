import { describe, expect, it, vi } from 'vitest'

import { seasonTotals } from '@/server/stats/lib/player-form'

import { ScoutService } from './scout.service'

import type { SeasonLine } from '../lib/radar'
import type {
    IStatsRepository,
    StatsLineRow,
    StatsPlayer,
} from '@/server/stats/repository/stats.repository.interface'
import type {
    IStatsService,
    PlayerListItem,
    PlayerProfile,
} from '@/server/stats/service/stats.service.interface'

const club = (id: string, name: string) => ({ id, name, logo: null })

const players: StatsPlayer[] = [
    {
        id: 'p1',
        externalId: 1,
        name: 'Seven',
        position: 'MID',
        club: club('c2', 'Brentford'),
        price: 7,
        availability: null,
    },
    {
        id: 'p2',
        externalId: 2,
        name: 'Five',
        position: 'MID',
        club: club('c1', 'Arsenal'),
        price: 5,
        availability: null,
    },
    {
        id: 'p3',
        externalId: 3,
        name: 'Unpriced',
        position: 'MID',
        club: club('c1', 'Arsenal'),
        price: null,
        availability: null,
    },
    {
        id: 'p4',
        externalId: 4,
        name: 'Striker',
        position: 'FWD',
        club: club('c2', 'Brentford'),
        price: 10,
        availability: null,
    },
]

const item = (p: StatsPlayer): PlayerListItem => ({
    id: p.id,
    externalId: p.externalId,
    name: p.name,
    club: p.club,
    position: p.position,
    price: p.price,
    minutes: 90,
    goals: 0,
    assists: 0,
    form: null,
    forecast: null,
    availability: null,
    next: null,
})

const profileOf = (player: StatsPlayer): PlayerProfile => ({
    player,
    totals: seasonTotals([]),
    form: null,
    recent: [],
    forecastEnabled: false,
    forecast: null,
    facts: { form: [], penaltyOrder: null },
    probabilities: null,
})

const row = (playerId: string, goals: number): StatsLineRow => ({
    playerId,
    fixtureId: `f-${playerId}`,
    opponentName: 'Opp',
    isHome: true,
    kickoff: new Date(Date.UTC(2026, 8, 1)),
    minutes: 90,
    goals,
    assists: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    penaltySaved: 0,
    penaltyMissed: 0,
    tackles: 0,
    blocks: 0,
    interceptions: 0,
    shotsTotal: 1,
    passesKey: 0,
    teamGoalsAgainst: 1,
})

/** A MID with one goal scores 2 + 5 = 7 points; without a goal 2. */
const lines = [row('p1', 1), row('p2', 0), row('p3', 0), row('p4', 0)]

const seasonLine = (playerId: string): SeasonLine => ({
    playerId,
    minutes: 90,
    goals: 0,
    assists: 0,
    shotsOn: 0,
    passesKey: 0,
    defActions: 0,
    duelsTotal: 0,
    duelsWon: 0,
    saves: 0,
    goalsConceded: 1,
    penaltySaved: 0,
    cleanSheet: false,
})

const make = () => {
    const stats = {
        getPlayers: vi.fn(),
        getPlayer: vi.fn().mockImplementation(async (id: string) => {
            const p = players.find((x) => x.id === id)

            return p ? profileOf(p) : null
        }),
        getAllPlayers: vi
            .fn()
            .mockResolvedValue({ items: players.map(item), forecastEnabled: false, nextEvent: null }),
        getFixtures: vi.fn(),
        getHeatmap: vi.fn(),
        getForecastStatus: vi.fn(),
        getProbabilityStatus: vi.fn(),
        listPlayerIds: vi.fn(),
    } satisfies IStatsService
    const repo = {
        findPlayers: vi.fn(),
        findLines: vi.fn().mockResolvedValue(lines),
        findNextEventFixtures: vi.fn(),
        findPredictions: vi.fn(),
        findFplMatches: vi.fn(),
        findPenaltyOrder: vi.fn(),
        countAppearances: vi.fn(),
        findFixturesByIds: vi.fn(),
        findUpcomingFixtures: vi.fn(),
        findSeasonLines: vi.fn().mockResolvedValue(players.map((p) => seasonLine(p.id))),
        findFplSeasonTotals: vi.fn().mockResolvedValue(new Map([['p1', { xg: 4.5, xa: null }]])),
    } satisfies IStatsRepository

    return new ScoutService(stats, repo)
}

describe('ScoutService.getList', () => {
    it('adds points per £m, empty without a fresh price', async () => {
        const { items } = await make().getList()
        const byId = new Map(items.map((i) => [i.id, i.pointsPerMillion]))

        expect(byId.get('p1')).toBe(1)
        expect(byId.get('p2')).toBeCloseTo(0.4)
        expect(byId.get('p3')).toBeNull()
    })

    it('lists each club once, sorted by name', async () => {
        const { clubs } = await make().getList()

        expect(clubs.map((c) => c.name)).toEqual(['Arsenal', 'Brentford'])
    })
})

describe('ScoutService.getProfile', () => {
    it('ranks points per £m among players of the same position', async () => {
        const { value, season } = await make().getProfile('p1')

        expect(value).toEqual({ points: 7, pointsPerMillion: 1, rank: 1, of: 2 })
        expect(season).toEqual({ xg: 4.5, xa: null })
    })

    it('has no points per £m and no rank when the price is missing, never Infinity', async () => {
        const { value, season } = await make().getProfile('p3')

        expect(value.points).toBe(2)
        expect(value.pointsPerMillion).toBeNull()
        expect(value.rank).toBeNull()
        expect(season).toEqual({ xg: null, xa: null })
    })

    it('marks a player with too few minutes as low data', async () => {
        const { radar } = await make().getProfile('p1')

        expect(radar.lowData).toBe(true)
        expect(radar.axes.every((a) => a.percentile === null)).toBe(true)
    })

    it('answers 404 for an unknown player', async () => {
        await expect(make().getProfile('nope')).rejects.toMatchObject({ statusCode: 404 })
    })
})

describe('ScoutService.compare', () => {
    it('returns the players in the requested order with their position', async () => {
        const result = await make().compare(['p2', 'p1'])

        expect(result.position).toBe('MID')
        expect(result.players.map((p) => p.profile.player.id)).toEqual(['p2', 'p1'])
    })

    it('rejects fewer than two or more than three players with 400', async () => {
        await expect(make().compare(['p1'])).rejects.toMatchObject({ statusCode: 400 })
        await expect(make().compare(['p1', 'p2', 'p3', 'p4'])).rejects.toMatchObject({ statusCode: 400 })
    })

    it('rejects a repeated player with 400', async () => {
        await expect(make().compare(['p1', 'p1'])).rejects.toMatchObject({ statusCode: 400 })
    })

    it('rejects players of different positions with 422 and a reason', async () => {
        await expect(make().compare(['p1', 'p4'])).rejects.toMatchObject({
            statusCode: 422,
            message: expect.stringMatching(/position/),
        })
    })

    it('answers 404 when one of the players is unknown', async () => {
        await expect(make().compare(['p1', 'nope'])).rejects.toMatchObject({ statusCode: 404 })
    })
})

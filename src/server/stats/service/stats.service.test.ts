import { describe, expect, it, vi } from 'vitest'

import { StatsService } from './stats.service'

import type {
    FormMatch,
    IStatsRepository,
    StatsFixture,
    StatsLineRow,
    StatsPlayer,
    UpcomingFixture,
} from '../repository/stats.repository.interface'
import type { Position } from '@/server/prediction/lib/scoring-rules'
import type { GateResult, Horizon, Metric } from '@/server/prediction/lib/v2/evaluation'
import type {
    FixtureProbabilityRow,
    PlayerMatchProbability,
} from '@/server/prediction/repository/probability.repository.interface'
import type { IForecastService } from '@/server/prediction/service/forecast.service.interface'
import type {
    IProbabilityService,
    ProbabilityStatus,
} from '@/server/prediction/service/probability.service.interface'

const club = (id: string, name = id) => ({ id, name, logo: null })

const player = (
    id: string,
    name: string,
    position: StatsPlayer['position'],
    clubId: string,
    price: number | null = 6,
): StatsPlayer => ({
    id,
    externalId: Number(id.replace(/\D/g, '')) || 1,
    name,
    position,
    club: club(clubId),
    price,
    availability: null,
})

const line = (playerId: string, day: number, overrides: Partial<StatsLineRow> = {}): StatsLineRow => ({
    playerId,
    fixtureId: `f${day}`,
    opponentName: 'Opp',
    isHome: true,
    kickoff: new Date(Date.UTC(2026, 8, day)),
    minutes: 90,
    goals: 0,
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
    ...overrides,
})

const players = [
    player('p1', 'Mohamed Salah', 'MID', 'LIV', 14),
    player('p2', 'Erling Haaland', 'FWD', 'MCI', 14.5),
    player('p3', 'Gabriel Magalhães', 'DEF', 'ARS', 6),
    player('p4', 'No Data', 'GK', 'ARS', null),
]

const lines = [
    line('p1', 1, { goals: 1 }),
    line('p1', 2),
    line('p2', 1, { goals: 2 }),
    line('p3', 1, { teamGoalsAgainst: 0 }),
]

interface Setup {
    status?: Partial<ProbabilityStatus>
    gates?: GateResult[]
    rows?: Record<string, PlayerMatchProbability[]>
    next?: Map<string, PlayerMatchProbability>
    fixtures?: StatsFixture[]
    upcoming?: UpcomingFixture[]
    fixtureProbs?: FixtureProbabilityRow[]
    form?: FormMatch[]
    appearances?: number
    penaltyOrder?: number | null
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD']

const gate = (metric: Metric, horizon: Horizon, position: Position | 'ALL', passed = true): GateResult => ({
    metric,
    horizon,
    position,
    n: 500,
    brier: 0.1,
    baselineBrier: 0.2,
    buckets: [],
    passed,
    reasons: passed ? [] : ['worse than the baseline'],
})

/** Every metric on for both horizons and every position, except the listed `off` ones as `metric:horizon:position`. */
const allGates = (off: string[] = []): GateResult[] =>
    (['next', 'later'] as const).flatMap((h) => [
        gate('outcome', h, 'ALL', !off.includes(`outcome:${h}:ALL`)),
        ...(['goal', 'assist', 'start', 'points'] as const).flatMap((m) =>
            POSITIONS.map((pos) => gate(m, h, pos, !off.includes(`${m}:${h}:${pos}`))),
        ),
    ])

const future = (day: number) => new Date(Date.UTC(2099, 0, day))

const fixture = (
    id: string,
    day: number,
    home = 'LIV',
    away = 'ARS',
    status = 'NS',
    fplEvent: number | null = 11,
): StatsFixture => ({
    id,
    kickoff: future(day),
    status,
    fplEvent,
    home: club(home),
    away: club(away),
})

const prob = (
    playerId: string,
    fixtureId: string,
    horizon: number,
    overrides: Partial<PlayerMatchProbability> = {},
): PlayerMatchProbability => ({
    fixtureId,
    playerId,
    horizon,
    pGoal: 0.3,
    pAssist: 0.2,
    pStart: 0.9,
    expectedMinutes: 80,
    expectedPoints: 6.1,
    pointsBuckets: [0.2, 0.3, 0.3, 0.2],
    ...overrides,
})

const fixtureProb = (fixtureId: string): FixtureProbabilityRow => ({
    fixtureId,
    pHome: 0.5,
    pDraw: 0.25,
    pAway: 0.25,
    xgHome: 1.9,
    xgAway: 1.0,
    leagueGoals: 1.4,
})

const fplRow = (day: number, overrides: Partial<FormMatch> = {}): FormMatch => ({
    fixtureId: `f${day}`,
    kickoff: new Date(Date.UTC(2026, 8, day)),
    opponentName: 'Opp',
    isHome: true,
    minutes: 90,
    started: true,
    goals: 0,
    xg: 0.3,
    assists: 0,
    xa: 0.1,
    ...overrides,
})

const make = (enabled: boolean, setup: Setup = {}) => {
    const fixtures = setup.fixtures ?? []
    const repo = {
        findPlayers: vi.fn().mockResolvedValue(players),
        findLines: vi
            .fn()
            .mockImplementation(async (id?: string) => (id ? lines.filter((l) => l.playerId === id) : lines)),
        findNextEventFixtures: vi.fn().mockResolvedValue({ event: 11, fixtures }),
        findPredictions: vi.fn().mockResolvedValue([
            { playerId: 'p1', expectedPoints: 7, expectedMinutes: 88, components: { goals: 2 } },
            { playerId: 'p3', expectedPoints: 5, expectedMinutes: 90, components: {} },
        ]),
        findFplMatches: vi.fn().mockResolvedValue(setup.form ?? []),
        findPenaltyOrder: vi.fn().mockResolvedValue(setup.penaltyOrder ?? null),
        countAppearances: vi.fn().mockResolvedValue(setup.appearances ?? 10),
        findFixturesByIds: vi
            .fn()
            .mockImplementation(async (ids: string[]) => fixtures.filter((f) => ids.includes(f.id))),
        findUpcomingFixtures: vi.fn().mockResolvedValue(setup.upcoming ?? []),
    } satisfies IStatsRepository
    const forecast = {
        run: vi.fn(),
        getStatus: vi.fn().mockResolvedValue({ enabled, nextEvent: 11, evaluation: null }),
    } satisfies IForecastService
    const probabilities = {
        run: vi.fn(),
        getStatus: vi.fn().mockResolvedValue({
            evaluatedAt: null,
            eventsEvaluated: 0,
            gates: [],
            pointsMeanOn: false,
            updatedAt: null,
            ...setup.status,
            ...(setup.gates ? { gates: setup.gates } : {}),
        } satisfies ProbabilityStatus),
        getPlayerMatches: vi.fn().mockImplementation(async (id: string) => setup.rows?.[id] ?? []),
        getNextMatchForAll: vi.fn().mockResolvedValue(setup.next ?? new Map()),
        getFixtureProbabilities: vi.fn().mockResolvedValue(setup.fixtureProbs ?? []),
    } satisfies IProbabilityService

    return new StatsService(repo, forecast, probabilities)
}

/** A stored evaluation with every gate on and the points mean passing, plus the given rows. */
const evaluated = (setup: Setup = {}): Setup => ({
    status: { evaluatedAt: future(1), eventsEvaluated: 10, pointsMeanOn: true, updatedAt: future(1) },
    gates: allGates(),
    ...setup,
})

describe('StatsService.getPlayers', () => {
    it('filters by position, club and search ignoring case and accents', async () => {
        const service = make(true)

        expect((await service.getPlayers({ position: 'FWD' })).items.map((i) => i.id)).toEqual(['p2'])
        expect((await service.getPlayers({ clubId: 'ARS' })).total).toBe(2)
        expect((await service.getPlayers({ search: 'magalhaes' })).items.map((i) => i.id)).toEqual(['p3'])
        expect((await service.getPlayers({ search: 'SALAH' })).items.map((i) => i.id)).toEqual(['p1'])
    })

    it('sorts by forecast when it is enabled, nulls last', async () => {
        const result = await make(true).getPlayers({})

        expect(result.sort).toBe('forecast')
        expect(result.items.map((i) => i.id).slice(0, 2)).toEqual(['p1', 'p3'])
    })

    it('hides the forecast and falls back to form when the bar is not passed', async () => {
        const result = await make(false).getPlayers({ sort: 'forecast' })

        expect(result.forecastEnabled).toBe(false)
        expect(result.items.every((i) => i.forecast === null)).toBe(true)
        expect(result.sort).toBe('form')
    })

    it('computes totals and form per player', async () => {
        const salah = (await make(true).getPlayers({ search: 'salah' })).items[0]

        expect(salah).toMatchObject({ minutes: 180, goals: 1, price: 14 })
        expect(salah.form).not.toBeNull()
    })

    it('a player without lines or price renders with nulls', async () => {
        const item = (await make(true).getPlayers({ search: 'no data' })).items[0]

        expect(item).toMatchObject({ minutes: 0, form: null, price: null, forecast: null })
    })

    it('paginates 50 per page and lists the clubs', async () => {
        const result = await make(true).getPlayers({ page: 2 })

        expect(result.pageSize).toBe(50)
        expect(result.items).toEqual([])
        expect(result.clubs.map((c) => c.id).sort()).toEqual(['ARS', 'LIV', 'MCI'])
    })
})

describe('StatsService.getPlayer', () => {
    it('returns null for an unknown id', async () => {
        expect(await make(true).getPlayer('nope')).toBeNull()
    })

    it('returns the profile with recent matches and the forecast when enabled', async () => {
        const profile = await make(true).getPlayer('p1')

        expect(profile?.recent).toHaveLength(2)
        expect(profile?.recent[0].kickoff.getTime()).toBeGreaterThan(
            profile?.recent[1].kickoff.getTime() as number,
        )
        expect(profile?.forecast).toMatchObject({ event: 11, expectedPoints: 7 })
    })

    it('has no forecast when the bar is not passed', async () => {
        const profile = await make(false).getPlayer('p1')

        expect(profile?.forecast).toBeNull()
        expect(profile?.forecastEnabled).toBe(false)
    })

    it('works for a player with no data at all', async () => {
        const profile = await make(true).getPlayer('p4')

        expect(profile?.recent).toEqual([])
        expect(profile?.form).toBeNull()
        expect(profile?.forecast).toBeNull()
    })
})

describe('StatsService probabilities', () => {
    const f1 = fixture('fx1', 5)
    const f2 = fixture('fx2', 12, 'ARS', 'LIV')

    it('profile.probabilities is null without any stored rows', async () => {
        const profile = await make(true, evaluated({ fixtures: [f1] })).getPlayer('p1')

        expect(profile?.probabilities).toBeNull()
    })

    it('profile.probabilities is null without any evaluation', async () => {
        const rows = { p1: [prob('p1', 'fx1', 1)] }
        const profile = await make(true, { rows, fixtures: [f1] }).getPlayer('p1')

        expect(profile?.probabilities).toBeNull()
    })

    it('a gated-off metric is null while others stay', async () => {
        const setup = evaluated({
            gates: allGates(['assist:next:MID']),
            rows: { p1: [prob('p1', 'fx1', 1)] },
            fixtures: [f1],
            fixtureProbs: [fixtureProb('fx1')],
        })
        const card = (await make(true, setup).getPlayer('p1'))?.probabilities
        const m = card?.matches[0]

        expect(card?.lowData).toBe(false)
        expect(m).toMatchObject({ pGoal: 0.3, pAssist: null, pStart: 0.9, expectedPoints: 6.1, horizon: 1 })
        expect(m?.pWin).toBe(0.5)
        expect(m?.pLose).toBe(0.25)
        expect(card?.offReasons.length).toBeGreaterThan(0)
    })

    it('uses the position of the player for the gate, not the ALL gate', async () => {
        const setup = evaluated({
            gates: [...allGates(['goal:next:MID']), gate('goal', 'next', 'ALL', true)],
            rows: { p1: [prob('p1', 'fx1', 1)] },
            fixtures: [f1],
        })

        expect((await make(true, setup).getPlayer('p1'))?.probabilities?.matches[0].pGoal).toBeNull()
    })

    it('lowData true and all numbers null below 3 appearances', async () => {
        const setup = evaluated({
            appearances: 2,
            rows: { p1: [prob('p1', 'fx1', 1)] },
            fixtures: [f1],
            fixtureProbs: [fixtureProb('fx1')],
        })
        const card = (await make(true, setup).getPlayer('p1'))?.probabilities

        expect(card?.lowData).toBe(true)
        expect(card?.matches[0]).toMatchObject({
            pGoal: null,
            pAssist: null,
            pStart: null,
            expectedMinutes: null,
            expectedPoints: null,
            pointsBuckets: null,
            pWin: null,
            pDraw: null,
            pLose: null,
        })
    })

    it('pointsBuckets null when pointsMeanOn is false, horizon 1 falls back to v1, later ones are null', async () => {
        const setup = evaluated({
            status: {
                evaluatedAt: future(1),
                eventsEvaluated: 10,
                pointsMeanOn: false,
                updatedAt: future(1),
            },
            rows: { p1: [prob('p1', 'fx1', 1), prob('p1', 'fx2', 2)] },
            fixtures: [f1, fixture('fx2', 12, 'ARS', 'LIV', 'NS', 12)],
        })
        const [first, second] = (await make(true, setup).getPlayer('p1'))?.probabilities?.matches ?? []

        expect(first.pointsBuckets).toBeNull()
        expect(first.expectedPoints).toBe(7)
        expect(second.pointsBuckets).toBeNull()
        expect(second.expectedPoints).toBeNull()
    })

    const meanOff = { evaluatedAt: future(1), eventsEvaluated: 10, pointsMeanOn: false, updatedAt: future(1) }

    it('a double gameweek hides the v1 points of match 1 when pointsMeanOn is false', async () => {
        const setup = evaluated({
            status: meanOff,
            rows: { p1: [prob('p1', 'fx1', 1), prob('p1', 'fx2', 2)] },
            fixtures: [f1, f2],
        })
        const card = (await make(true, setup).getPlayer('p1'))?.probabilities

        expect(card?.matches.map((m) => m.expectedPoints)).toEqual([null, null])
        expect(card?.offReasons.some((r) => r.includes('double gameweek'))).toBe(true)
    })

    it('a single-gameweek player still gets the v1 points of match 1 when pointsMeanOn is false', async () => {
        const setup = evaluated({ status: meanOff, rows: { p1: [prob('p1', 'fx1', 1)] }, fixtures: [f1] })
        const card = (await make(true, setup).getPlayer('p1'))?.probabilities

        expect(card?.matches[0].expectedPoints).toBe(7)
        expect(card?.offReasons.some((r) => r.includes('double gameweek'))).toBe(false)
    })

    it('v1 points are not used for a horizon 1 fixture outside the v1 forecast event', async () => {
        const later = fixture('fx9', 5, 'LIV', 'ARS', 'NS', 12)
        const setup = evaluated({ status: meanOff, rows: { p1: [prob('p1', 'fx9', 1)] }, fixtures: [later] })

        expect((await make(true, setup).getPlayer('p1'))?.probabilities?.matches[0].expectedPoints).toBeNull()
    })

    it('without v1 the horizon 1 points are null when pointsMeanOn is false', async () => {
        const setup = evaluated({
            status: {
                evaluatedAt: future(1),
                eventsEvaluated: 10,
                pointsMeanOn: false,
                updatedAt: future(1),
            },
            rows: { p1: [prob('p1', 'fx1', 1)] },
            fixtures: [f1],
        })

        expect(
            (await make(false, setup).getPlayer('p1'))?.probabilities?.matches[0].expectedPoints,
        ).toBeNull()
    })

    it('shows v2 points and buckets when the mean is on and the points gate passes', async () => {
        const setup = evaluated({
            gates: allGates(['points:later:MID']),
            rows: { p1: [prob('p1', 'fx1', 1), prob('p1', 'fx2', 2)] },
            fixtures: [f1, f2],
        })
        const [first, second] = (await make(true, setup).getPlayer('p1'))?.probabilities?.matches ?? []

        expect(first).toMatchObject({ expectedPoints: 6.1, pointsBuckets: [0.2, 0.3, 0.3, 0.2] })
        expect(second).toMatchObject({ expectedPoints: null, pointsBuckets: null })
    })

    it('double gameweek gives two matches with horizons 1 and 2', async () => {
        const setup = evaluated({
            rows: { p1: [prob('p1', 'fx2', 2), prob('p1', 'fx1', 1)] },
            fixtures: [f1, f2],
        })
        const card = (await make(true, setup).getPlayer('p1'))?.probabilities

        expect(card?.matches.map((m) => m.horizon)).toEqual([1, 2])
        expect(card?.matches.map((m) => m.fixtureId)).toEqual(['fx1', 'fx2'])
        expect(card?.matches[0].isHome).toBe(true)
        expect(card?.matches[1].isHome).toBe(false)
    })

    it('a match without a fixture probability row has null win chances', async () => {
        const setup = evaluated({
            rows: { p1: [prob('p1', 'fx1', 1)] },
            fixtures: [f1],
            fixtureProbs: [],
        })
        const m = (await make(true, setup).getPlayer('p1'))?.probabilities?.matches[0]

        expect(m).toMatchObject({ pWin: null, pDraw: null, pLose: null, pGoal: 0.3 })
    })

    it('hides stale rows whose fixture is missing or already finished', async () => {
        const finished = { ...fixture('fx0', 1), kickoff: new Date(Date.UTC(2020, 0, 1)), status: 'FT' }
        const setup = evaluated({
            rows: { p1: [prob('p1', 'fx0', 1), prob('p1', 'gone', 2), prob('p1', 'fx1', 3)] },
            fixtures: [finished, f1],
        })
        const card = (await make(true, setup).getPlayer('p1'))?.probabilities

        expect(card?.matches.map((m) => m.fixtureId)).toEqual(['fx1'])
    })

    it('the card is null when every stored row is stale', async () => {
        const finished = { ...fixture('fx0', 1), kickoff: new Date(Date.UTC(2020, 0, 1)), status: 'FT' }
        const setup = evaluated({ rows: { p1: [prob('p1', 'fx0', 1)] }, fixtures: [finished] })

        expect((await make(true, setup).getPlayer('p1'))?.probabilities).toBeNull()
    })

    it('form uses null xg, never 0, for rows without xG and keeps the last 10 in kickoff order', async () => {
        const form = Array.from({ length: 12 }, (_, i) => fplRow(i + 1, { xg: null, xa: null }))
        const profile = await make(true, { form: [...form].reverse() }).getPlayer('p1')

        expect(profile?.facts.form).toHaveLength(10)
        expect(profile?.facts.form[0].fixtureId).toBe('f3')
        expect(profile?.facts.form[9].fixtureId).toBe('f12')
        expect(profile?.facts.form.every((m) => m.xg === null && m.xa === null)).toBe(true)
    })

    it('form keeps a double gameweek as two entries and exposes the penalty order', async () => {
        const form = [fplRow(1), fplRow(1, { fixtureId: 'f1b' })]
        const profile = await make(true, { form, penaltyOrder: 1 }).getPlayer('p1')

        expect(profile?.facts.form).toHaveLength(2)
        expect(profile?.facts.penaltyOrder).toBe(1)
    })

    it('explains the forecast from stored facts', async () => {
        const form = Array.from({ length: 10 }, (_, i) =>
            fplRow(i + 1, { started: i > 0, goals: i < 4 ? 1 : 0, xg: 0.2 }),
        )
        const setup = evaluated({
            form,
            penaltyOrder: 1,
            rows: { p1: [prob('p1', 'fx1', 1)] },
            fixtures: [f1],
            fixtureProbs: [fixtureProb('fx1')],
        })
        const card = (await make(true, setup).getPlayer('p1'))?.probabilities

        expect(card?.explanation).toEqual([
            'Started 9 of the last 10 team matches',
            'First-choice penalty taker',
            'Team is expected to score 1.9 goals here (league average 1.4), a high-scoring setup',
        ])
    })

    it('list sort by pGoal puts null last', async () => {
        const setup = evaluated({
            fixtures: [f1],
            next: new Map([
                ['p3', prob('p3', 'fx1', 1, { pGoal: 0.05 })],
                ['p2', prob('p2', 'fx1', 1, { pGoal: 0.5 })],
            ]),
        })
        const result = await make(true, setup).getPlayers({ sort: 'pGoal' })

        expect(result.items.map((i) => i.id).slice(0, 2)).toEqual(['p2', 'p3'])
        expect(result.items.slice(2).every((i) => i.next === null)).toBe(true)
        expect(result.items[0].next).toEqual({ pGoal: 0.5, pAssist: 0.2, pStart: 0.9 })
    })

    it('list hides a gated-off metric and every metric without an evaluation', async () => {
        const next = new Map([['p2', prob('p2', 'fx1', 1)]])
        const off = await make(
            true,
            evaluated({ gates: allGates(['goal:next:FWD']), fixtures: [f1], next }),
        ).getPlayers({
            search: 'haaland',
        })
        const none = await make(true, { fixtures: [f1], next }).getPlayers({ search: 'haaland' })

        expect(off.items[0].next).toEqual({ pGoal: null, pAssist: 0.2, pStart: 0.9 })
        expect(none.items[0].next).toBeNull()
    })

    it('fixtures carry gated outcome chances', async () => {
        const on = await make(
            true,
            evaluated({ fixtures: [f1], fixtureProbs: [fixtureProb('fx1')] }),
        ).getFixtures()
        const off = await make(
            true,
            evaluated({
                gates: allGates(['outcome:next:ALL']),
                fixtures: [f1],
                fixtureProbs: [fixtureProb('fx1')],
            }),
        ).getFixtures()
        const missing = await make(true, evaluated({ fixtures: [f1] })).getFixtures()

        expect(on.fixtures[0].probabilities).toEqual({ pHome: 0.5, pDraw: 0.25, pAway: 0.25 })
        expect(off.fixtures[0].probabilities).toEqual({ pHome: null, pDraw: null, pAway: null })
        expect(missing.fixtures[0].probabilities).toBeNull()
    })

    it('heatmap lists the next events with expected goals and clean-sheet chance per club', async () => {
        const upcoming: UpcomingFixture[] = [
            { ...f1, event: 11 },
            { ...f2, event: 12 },
        ]
        const heat = await make(
            true,
            evaluated({ upcoming, fixtureProbs: [fixtureProb('fx1'), fixtureProb('fx2')] }),
        ).getHeatmap()
        const liv = heat.clubs.find((c) => c.clubId === 'LIV')

        expect(heat.events).toEqual([11, 12])
        expect(liv?.cells[0].matches[0]).toMatchObject({ opponent: 'ARS', isHome: true, xgFor: 1.9 })
        expect(liv?.cells[0].matches[0].pCleanSheet).toBeCloseTo(Math.exp(-1.0), 5)
        expect(liv?.cells[1].matches[0]).toMatchObject({ isHome: false, xgFor: 1.0 })
    })

    it('heatmap leaves matches empty for an event without a match', async () => {
        const upcoming: UpcomingFixture[] = [
            { ...f1, event: 11 },
            { ...fixture('fx3', 12, 'MCI', 'CHE'), event: 12 },
        ]
        const heat = await make(
            true,
            evaluated({ upcoming, fixtureProbs: [fixtureProb('fx1'), fixtureProb('fx3')] }),
        ).getHeatmap()

        expect(heat.clubs.find((c) => c.clubId === 'LIV')?.cells.map((c) => c.matches.length)).toEqual([1, 0])
    })

    it('heatmap flags a hidden match apart from a real blank gameweek', async () => {
        const upcoming: UpcomingFixture[] = [
            { ...f1, event: 11 },
            { ...f2, event: 12 },
            { ...fixture('fx3', 19, 'MCI', 'CHE'), event: 13 },
            { ...fixture('fx4', 20, 'MCI', 'CHE'), event: 13 },
        ]
        const heat = await make(
            true,
            evaluated({
                gates: allGates(['outcome:later:ALL']),
                upcoming,
                fixtureProbs: [fixtureProb('fx1'), fixtureProb('fx2'), fixtureProb('fx3')],
            }),
        ).getHeatmap()
        const cells = (id: string) =>
            heat.clubs.find((c) => c.clubId === id)?.cells.map((c) => [c.matches.length, c.hidden])

        // LIV: shown, hidden by the later-horizon gate, no fixture at all.
        expect(cells('LIV')).toEqual([
            [1, false],
            [0, true],
            [0, false],
        ])
        // MCI: double gameweek where the second match has no probability row.
        expect(cells('MCI')).toEqual([
            [0, false],
            [0, false],
            [1, true],
        ])
    })

    it('heatmap is empty without an evaluation', async () => {
        const upcoming: UpcomingFixture[] = [{ ...f1, event: 11 }]

        expect(await make(true, { upcoming, fixtureProbs: [fixtureProb('fx1')] }).getHeatmap()).toEqual({
            events: [],
            clubs: [],
        })
    })
})

describe('StatsService.getProbabilityStatus', () => {
    it('passes the probability status through', async () => {
        const status = await make(true, evaluated()).getProbabilityStatus()

        expect(status.eventsEvaluated).toBe(10)
        expect(status.gates.length).toBeGreaterThan(0)
        expect(status.pointsMeanOn).toBe(true)
    })

    it('reports an empty state before the first evaluation', async () => {
        expect(await make(true).getProbabilityStatus()).toMatchObject({ evaluatedAt: null, gates: [] })
    })
})

import { describe, expect, it } from 'vitest'

import { availabilityFactor, buildInputsForEvent, positionPriors } from './inputs'

import type { DatasetFixture, ForecastDataset, StoredMatch } from './inputs'

const day = (d: number) => new Date(Date.UTC(2026, 7, d))

const fixture = (
    id: string,
    d: number,
    home: string,
    away: string,
    event: number | null,
    finished = true,
    goals: [number, number] = [1, 1],
): DatasetFixture => ({
    fixtureId: id,
    kickoff: day(d),
    homeTeamId: home,
    awayTeamId: away,
    homeGoals: finished ? goals[0] : null,
    awayGoals: finished ? goals[1] : null,
    fplEvent: event,
    status: finished ? 'FT' : 'NS',
})

const line = (
    fixtureId: string,
    d: number,
    teamId: string,
    playerId: string,
    extra: Partial<StoredMatch> = {},
): StoredMatch => ({
    kickoff: day(d),
    fixtureId,
    teamId,
    playerId,
    minutes: 90,
    goals: 0,
    assists: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    tackles: 1,
    blocks: 1,
    interceptions: 1,
    position: 'MID',
    ...extra,
})

const dataset = (overrides: Partial<ForecastDataset> = {}): ForecastDataset => ({
    matches: [],
    fixtures: [],
    players: [{ playerId: 'p1', fplId: 101, position: 'MID', currentTeamId: 'A' }],
    fplPoints: new Map(),
    availability: new Map(),
    events: [
        { id: 2, finished: true, isNext: false, isCurrent: false },
        { id: 3, finished: false, isNext: true, isCurrent: false },
    ],
    ...overrides,
})

const base = (): Pick<ForecastDataset, 'fixtures' | 'matches'> => ({
    fixtures: [
        fixture('f1', 1, 'A', 'B', 1),
        fixture('f2', 8, 'B', 'A', 2),
        fixture('f3', 15, 'A', 'C', 3, false),
    ],
    matches: [line('f1', 1, 'A', 'p1', { goals: 1 }), line('f2', 8, 'A', 'p1')],
})

describe('buildInputsForEvent', () => {
    it('ignores matches at or after the cutoff', () => {
        const { fixtures, matches } = base()
        const withFuture = {
            fixtures: [...fixtures, fixture('f4', 22, 'A', 'D', 4, true, [5, 0])],
            matches: [...matches, line('f4', 22, 'A', 'p1', { goals: 5 })],
        }
        const a = buildInputsForEvent(dataset({ fixtures, matches }), 3, { useAvailability: false })
        const b = buildInputsForEvent(dataset(withFuture), 3, { useAvailability: false })

        expect(b.inputs[0].input.appearances).toEqual(a.inputs[0].input.appearances)
        expect(b.inputs[0].input.fixtures).toEqual(a.inputs[0].input.fixtures)
        expect(a.inputs[0].input.appearances.map((x) => x.goals)).toEqual([0, 1])
    })

    it('a line at exactly the cutoff is excluded', () => {
        const { fixtures, matches } = base()
        const same = [...matches, line('f3', 15, 'A', 'p1', { goals: 9 })]
        const result = buildInputsForEvent(dataset({ fixtures, matches: same }), 3, {
            useAvailability: false,
        })

        expect(result.inputs[0].input.appearances.map((x) => x.goals)).toEqual([0, 1])
    })

    it("uses the player's latest club before the cutoff", () => {
        const fixtures = [
            fixture('f1', 1, 'A', 'B', 1),
            fixture('f2', 8, 'B', 'D', 2),
            fixture('f3', 15, 'B', 'C', 3, false),
            fixture('f3b', 15, 'A', 'D', 3, false),
        ]
        const matches = [line('f1', 1, 'A', 'p1'), line('f2', 8, 'B', 'p1')]
        const result = buildInputsForEvent(dataset({ fixtures, matches }), 3, { useAvailability: false })
        const ctx = result.inputs[0].input.fixtures

        expect(ctx).toHaveLength(1)
        expect(ctx[0].isHome).toBe(true)
        expect(result.inputs[0].teamId).toBe('B')
    })

    it('a double gameweek yields two fixture contexts and a blank gameweek none', () => {
        const fixtures = [...base().fixtures, fixture('f3x', 17, 'D', 'A', 3, false)]
        const players = [
            { playerId: 'p1', fplId: 101, position: 'MID' as const, currentTeamId: 'A' },
            { playerId: 'p9', fplId: 109, position: 'MID' as const, currentTeamId: 'E' },
        ]
        const result = buildInputsForEvent(dataset({ fixtures, matches: base().matches, players }), 3, {
            useAvailability: false,
        })

        expect(result.inputs.find((i) => i.playerId === 'p1')?.input.fixtures).toHaveLength(2)
        expect(result.inputs.find((i) => i.playerId === 'p9')?.input.fixtures).toHaveLength(0)
    })

    it('availability is only applied when useAvailability is set', () => {
        const availability = new Map([['p1', { status: 'i', chanceOfPlaying: 0 }]])
        const ds = dataset({ ...base(), availability })

        expect(buildInputsForEvent(ds, 3, { useAvailability: false }).inputs[0].input.availability).toBe(1)
        expect(buildInputsForEvent(ds, 3, { useAvailability: true }).inputs[0].input.availability).toBe(0)
    })

    it('a newcomer with no lines gets empty appearances and zero team-match minutes', () => {
        const result = buildInputsForEvent(dataset({ fixtures: base().fixtures, matches: [] }), 3, {
            useAvailability: false,
        })
        const input = result.inputs[0].input

        expect(input.appearances).toEqual([])
        expect(input.teamMatchMinutes.every((m) => m === 0)).toBe(true)
    })

    it('team match minutes are 0 for matches the player missed, newest first', () => {
        const { fixtures } = base()
        const matches = [line('f1', 1, 'A', 'p1')]
        const input = buildInputsForEvent(dataset({ fixtures, matches }), 3, { useAvailability: false })
            .inputs[0].input

        expect(input.teamMatchMinutes).toEqual([0, 90])
    })

    it("'next' resolves to the event flagged isNext and reports its id", () => {
        const result = buildInputsForEvent(dataset(base()), 'next', { useAvailability: true })

        expect(result.event).toBe(3)
        expect(result.inputs).toHaveLength(1)
    })

    it('an event without fixtures returns no inputs', () => {
        const result = buildInputsForEvent(dataset(base()), 9, { useAvailability: false })

        expect(result.inputs).toEqual([])
        expect(result.cutoff).toBeNull()
    })
})

describe('availabilityFactor', () => {
    it('maps FPL status and chance to a multiplier', () => {
        expect(availabilityFactor(undefined)).toBe(1)
        expect(availabilityFactor({ status: 'a', chanceOfPlaying: null })).toBe(1)
        expect(availabilityFactor({ status: 'i', chanceOfPlaying: 0 })).toBe(0)
        expect(availabilityFactor({ status: 'i', chanceOfPlaying: null })).toBe(0)
        expect(availabilityFactor({ status: 'd', chanceOfPlaying: 50 })).toBe(0.5)
        expect(availabilityFactor({ status: 'd', chanceOfPlaying: null })).toBe(0.75)
        expect(availabilityFactor({ status: 'i', chanceOfPlaying: 25 })).toBe(0.25)
        expect(availabilityFactor({ status: 's', chanceOfPlaying: null })).toBe(0)
        expect(availabilityFactor({ status: 'a', chanceOfPlaying: 100 })).toBe(1)
    })
})

describe('positionPriors', () => {
    it('uses only lines before the cutoff', () => {
        const lines = [
            line('f1', 1, 'A', 'p1', { goals: 1, position: 'FWD' }),
            line('f9', 20, 'A', 'p2', { goals: 9, position: 'FWD' }),
        ]
        const priors = positionPriors(lines, day(10))

        expect(priors.FWD.goals).toBeCloseTo(1, 9)
    })

    it('falls back to sensible defaults for a position without data', () => {
        const priors = positionPriors([], day(10))

        expect(priors.GK.saves).toBeGreaterThan(1)
        expect(priors.FWD.goals).toBeGreaterThan(priors.DEF.goals)
    })
})

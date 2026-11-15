import { describe, expect, it } from 'vitest'

import { DEFAULT_PARAMS, predictPlayer } from './model'

import type { FixtureContext, MatchLine, PlayerInput, PositionPrior } from './model'

const prior: PositionPrior = {
    goals: 0.1,
    assists: 0.1,
    saves: 0,
    yellowCards: 0.1,
    redCards: 0.005,
    defensiveActions: 5,
}

const fixture = (overrides: Partial<FixtureContext> = {}): FixtureContext => ({
    isHome: true,
    teamGoalsFor: 1.5,
    teamGoalsAgainst: 1.2,
    teamBaselineGoals: 1.5,
    ...overrides,
})

const appearance = (overrides: Partial<MatchLine> = {}): MatchLine => ({
    minutes: 90,
    goals: 0,
    assists: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    defensiveActions: 5,
    ...overrides,
})

const input = (overrides: Partial<PlayerInput> = {}): PlayerInput => ({
    position: 'MID',
    appearances: Array.from({ length: 6 }, () => appearance()),
    teamMatchMinutes: [90, 90, 90, 90, 90, 90],
    availability: 1,
    fixtures: [fixture()],
    prior,
    ...overrides,
})

describe('predictPlayer', () => {
    it('a player with no history and full availability still returns finite numbers', () => {
        const result = predictPlayer(input({ appearances: [], teamMatchMinutes: [] }))

        expect(Number.isFinite(result.rawPoints)).toBe(true)
        expect(Number.isFinite(result.expectedMinutes)).toBe(true)
        expect(result.expectedMinutes).toBe(0)
    })

    it('an unavailable player gets 0 minutes and 0 points', () => {
        const result = predictPlayer(input({ availability: 0 }))

        expect(result.expectedMinutes).toBe(0)
        expect(result.rawPoints).toBeCloseTo(0, 12)
    })

    it('a double gameweek is twice a single fixture for identical fixtures', () => {
        const single = predictPlayer(input({ fixtures: [fixture()] }))
        const double = predictPlayer(input({ fixtures: [fixture(), fixture()] }))

        expect(double.rawPoints).toBeCloseTo(2 * single.rawPoints, 9)
        expect(double.expectedMinutes).toBeCloseTo(2 * single.expectedMinutes, 9)
    })

    it('a blank gameweek gives 0 points and 0 minutes', () => {
        const result = predictPlayer(input({ fixtures: [] }))

        expect(result.rawPoints).toBe(0)
        expect(result.expectedMinutes).toBe(0)
    })

    it('a defender gains from a strong defence against a weak attack', () => {
        const good = predictPlayer(input({ position: 'DEF', fixtures: [fixture({ teamGoalsAgainst: 0.6 })] }))
        const bad = predictPlayer(input({ position: 'DEF', fixtures: [fixture({ teamGoalsAgainst: 1.8 })] }))

        expect(good.rawPoints).toBeGreaterThan(bad.rawPoints)
    })

    it('a striker with a better goals-per-90 history scores more', () => {
        const scorer = predictPlayer(
            input({
                position: 'FWD',
                appearances: Array.from({ length: 6 }, () => appearance({ goals: 1 })),
            }),
        )
        const dry = predictPlayer(input({ position: 'FWD' }))

        expect(scorer.rawPoints).toBeGreaterThan(dry.rawPoints)
    })

    it('a better attacking fixture raises the expected points of an attacker', () => {
        const easy = predictPlayer(input({ position: 'FWD', fixtures: [fixture({ teamGoalsFor: 2.4 })] }))
        const hard = predictPlayer(input({ position: 'FWD', fixtures: [fixture({ teamGoalsFor: 0.8 })] }))

        expect(easy.rawPoints).toBeGreaterThan(hard.rawPoints)
    })

    it('more minutes in recent team matches mean more expected points', () => {
        const regular = predictPlayer(input())
        const rotated = predictPlayer(input({ teamMatchMinutes: [20, 0, 90, 0, 15, 0] }))

        expect(regular.expectedMinutes).toBeGreaterThan(rotated.expectedMinutes)
        expect(regular.rawPoints).toBeGreaterThan(rotated.rawPoints)
    })

    it('goalkeepers score saves and no defensive contribution, outfield players the other way round', () => {
        const keeper = predictPlayer(
            input({ position: 'GK', appearances: Array.from({ length: 6 }, () => appearance({ saves: 4 })) }),
        )
        const mid = predictPlayer(input({ position: 'MID' }))

        expect(keeper.components.saves).toBeGreaterThan(0)
        expect(keeper.components.defensive).toBe(0)
        expect(mid.components.saves).toBe(0)
        expect(mid.components.conceded).toBe(0)
    })

    it('the components add up to the raw points', () => {
        const result = predictPlayer(input({ position: 'DEF' }), DEFAULT_PARAMS)
        const sum = Object.values(result.components).reduce((a, b) => a + b, 0)

        expect(sum).toBeCloseTo(result.rawPoints, 9)
    })
})

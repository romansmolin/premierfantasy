import { describe, expect, it } from 'vitest'

import { bucketDistribution, predictPlayerMatches } from './model'
import { DEFAULT_V2 } from './params'

import type { PlayerInputV2, V2Fixture, V2Line } from './model'
import type { V2Params } from './params'
import type { PositionPrior } from '../model'

const prior: PositionPrior = {
    goals: 0.9,
    assists: 0.1,
    saves: 0,
    yellowCards: 0.1,
    redCards: 0.005,
    defensiveActions: 5,
}

const line = (overrides: Partial<V2Line> = {}): V2Line => ({
    minutes: 90,
    goals: 0,
    assists: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    defensiveActions: 5,
    xg: 0.9,
    xa: 0.1,
    started: true,
    ...overrides,
})

const fixture = (n: number): V2Fixture => ({
    fixtureId: `f${n}`,
    kickoff: new Date(Date.UTC(2026, 7, n)),
    opponentTeamId: 'B',
    isHome: true,
    teamGoalsFor: 1.4,
    teamGoalsAgainst: 1.2,
    teamBaselineGoals: 1.4,
})

const input = (overrides: Partial<PlayerInputV2> = {}): PlayerInputV2 => ({
    position: 'FWD',
    appearances: [line(), line(), line()],
    teamMatches: [1, 2, 3].map(() => ({ minutes: 90, started: true })),
    availability: 1,
    fixtures: [fixture(1)],
    prior,
    ...overrides,
})

const params: V2Params = { ...DEFAULT_V2, xgWeight: 1, sims: 500 }
const opts = { withDistribution: false, seed: 1 }

describe('predictPlayerMatches', () => {
    it('returns null below MIN_APPEARANCES', () => {
        expect(predictPlayerMatches(input({ appearances: [line(), line()] }), params, opts)).toBeNull()
    })

    it('pGoal equals 1 - exp(-lambda)', () => {
        const [f] = predictPlayerMatches(input(), params, opts)!

        // rate = 0.9 per 90 (xg only, prior equal), attack = 1, so lambda = 0.9 · expectedMinutes / 90.
        expect(f.pGoal).toBeCloseTo(1 - Math.exp((-0.9 * f.expectedMinutes) / 90), 2)
        expect(Math.abs(f.pGoal - (1 - Math.exp((-0.9 * f.expectedMinutes) / 90)))).toBeLessThan(0.05)
    })

    it('falls back to goals when xg is null', () => {
        const blended = { ...params, xgWeight: 0.5 }
        const withXg = predictPlayerMatches(
            input({ appearances: [1, 2, 3].map(() => line({ xg: 1, goals: 1 })) }),
            blended,
            opts,
        )!
        const noXg = predictPlayerMatches(
            input({ appearances: [1, 2, 3].map(() => line({ xg: null, goals: 1 })) }),
            blended,
            opts,
        )!

        const lowXg = predictPlayerMatches(
            input({ appearances: [1, 2, 3].map(() => line({ xg: 0.2, goals: 1 })) }),
            blended,
            opts,
        )!

        expect(noXg[0].pGoal).toBeCloseTo(withXg[0].pGoal, 12)
        expect(Math.abs(lowXg[0].pGoal - noXg[0].pGoal)).toBeGreaterThan(0.01)
    })

    it('pGoal mixes P(at least one) over start and absent roles', () => {
        const half = [1, 2, 3, 4, 5, 6].map((n) => ({ minutes: n % 2 ? 90 : 0, started: n % 2 === 1 }))
        const [f] = predictPlayerMatches(input({ teamMatches: half }), params, opts)!
        // One role: starts 90 minutes with probability pStart; rate 0.9 per 90, attack 1, so λ_start = 0.9.
        const lambdaStart = 0.9

        expect(f.pStart).toBeCloseTo(f.pPlay, 12)
        expect(f.pGoal).toBeCloseTo(f.pStart * (1 - Math.exp(-lambdaStart)), 12)
        expect(f.pGoal - (1 - Math.exp(-f.pStart * lambdaStart))).toBeLessThan(-0.02)
    })

    it('availability 0 gives pStart 0 and pGoal 0', () => {
        const [f] = predictPlayerMatches(input({ availability: 0 }), params, opts)!

        expect(f.pStart).toBe(0)
        expect(f.pGoal).toBe(0)
    })

    it('a double gameweek returns two forecasts with horizons 1 and 2', () => {
        const result = predictPlayerMatches(input({ fixtures: [fixture(1), fixture(3)] }), params, opts)!

        expect(result.map((f) => f.horizon)).toEqual([1, 2])
    })

    it('a team with 3 scheduled matches returns 3', () => {
        const result = predictPlayerMatches(
            input({ fixtures: [fixture(1), fixture(8), fixture(15)] }),
            params,
            opts,
        )!

        expect(result).toHaveLength(3)
    })

    it('pStart is higher for a player who started 6 of 6 than 3 of 6', () => {
        const all = [1, 2, 3, 4, 5, 6].map(() => ({ minutes: 90, started: true }))
        const half = all.map((m, i) => (i % 2 === 0 ? m : { minutes: 20, started: false }))
        const [a] = predictPlayerMatches(input({ teamMatches: all }), params, opts)!
        const [b] = predictPlayerMatches(input({ teamMatches: half }), params, opts)!

        expect(a.pStart).toBeGreaterThan(b.pStart)
    })

    it('same seed gives identical samples', () => {
        const withDist = { withDistribution: true, seed: 42 }
        const a = predictPlayerMatches(input({ fixtures: [fixture(1), fixture(3)] }), params, withDist)!
        const b = predictPlayerMatches(input({ fixtures: [fixture(1), fixture(3)] }), params, withDist)!

        expect(a[0].pointsSamples).toHaveLength(params.sims)
        expect(a.map((f) => f.pointsSamples)).toEqual(b.map((f) => f.pointsSamples))
        expect(a[0].pointsSamples).not.toEqual(a[1].pointsSamples)
    })

    it('rawPoints is the mean of the simulated points', () => {
        const big = { ...params, sims: 20000 }
        const [f] = predictPlayerMatches(input({ position: 'DEF' }), big, {
            withDistribution: true,
            seed: 7,
        })!
        const mean = f.pointsSamples!.reduce((a, b) => a + b, 0) / f.pointsSamples!.length

        expect(Math.abs(mean - f.rawPoints)).toBeLessThan(0.1)
    })
})

describe('bucketDistribution', () => {
    it('bucketDistribution sums to 1 and a +20 shift puts all mass in bucket 3', () => {
        const samples = [0, 1, 2, 3, 6, 10]
        const d = bucketDistribution(samples, 0)

        expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
        expect(d).toEqual([3 / 6, 1 / 6, 1 / 6, 1 / 6])
        expect(bucketDistribution(samples, 20)).toEqual([0, 0, 0, 1])
    })
})

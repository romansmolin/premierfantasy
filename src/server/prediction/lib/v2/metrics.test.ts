import { describe, expect, it } from 'vitest'

import { brier, brierMulti, calibrationBuckets, mulberry32, samplePoisson } from './metrics'
import { bucketOfPoints } from './params'

describe('brier', () => {
    it('is 0 for perfect forecasts and 0.25 for coin flips', () => {
        expect(brier([1, 0], [true, false])).toBe(0)
        expect(brier([0.5, 0.5], [true, false])).toBe(0.25)
    })

    it('is 0 on empty input', () => {
        expect(brier([], [])).toBe(0)
    })
})

describe('brierMulti', () => {
    it('sums squared error over classes and averages over rows', () => {
        expect(brierMulti([[1, 0, 0]], [0])).toBe(0)
        expect(
            brierMulti(
                [
                    [0.5, 0.5, 0],
                    [0, 0, 1],
                ],
                [0, 2],
            ),
        ).toBeCloseTo(0.25, 12)
    })

    it('is 0 on empty input', () => {
        expect(brierMulti([], [])).toBe(0)
    })
})

describe('calibrationBuckets', () => {
    it('groups by width, omits empty buckets and closes the last bucket on the right', () => {
        const out = calibrationBuckets([0.05, 0.08, 0.95, 1], [false, true, true, true])

        expect(out).toHaveLength(2)
        expect(out[0]).toMatchObject({ lo: 0, hi: 0.1, n: 2 })
        expect(out[0].predicted).toBeCloseTo(0.065, 12)
        expect(out[0].observed).toBe(0.5)
        expect(out[1]).toMatchObject({ lo: 0.9, hi: 1, n: 2, observed: 1 })
    })
})

describe('mulberry32', () => {
    it('is deterministic and within [0, 1)', () => {
        const a = mulberry32(1)
        const b = mulberry32(1)
        const xs = Array.from({ length: 50 }, () => a())

        expect(xs).toEqual(Array.from({ length: 50 }, () => b()))
        expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
    })
})

describe('samplePoisson', () => {
    it('returns 0 for lambda 0', () => {
        expect(samplePoisson(0, mulberry32(1))).toBe(0)
    })

    it('has the right mean', () => {
        for (const lambda of [2, 50]) {
            const rng = mulberry32(7)
            const n = 20000
            let sum = 0

            for (let i = 0; i < n; i += 1) sum += samplePoisson(lambda, rng)

            expect(Math.abs(sum / n - lambda)).toBeLessThan(lambda === 2 ? 0.05 : 0.3)
        }
    })
})

describe('bucketOfPoints', () => {
    it('maps points to the four buckets', () => {
        expect([-1, 2].map(bucketOfPoints)).toEqual([0, 0])
        expect([3, 5].map(bucketOfPoints)).toEqual([1, 1])
        expect([6, 9].map(bucketOfPoints)).toEqual([2, 2])
        expect([10, 14].map(bucketOfPoints)).toEqual([3, 3])
    })
})

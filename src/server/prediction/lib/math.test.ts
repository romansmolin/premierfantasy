import { describe, expect, it } from 'vitest'

import {
    clamp,
    decayWeights,
    expectedHalfConceded,
    fitLinear,
    mae,
    mean,
    poissonAtLeast,
    poissonPmf,
    shrunkRate,
    spearman,
    weightedMean,
} from './math'

describe('poisson', () => {
    it('pmf matches known values', () => {
        expect(poissonPmf(0, 1.5)).toBeCloseTo(0.2231, 4)
        expect(poissonPmf(2, 2)).toBeCloseTo(0.2707, 4)
    })

    it('atLeast is a tail probability', () => {
        expect(poissonAtLeast(0, 3)).toBe(1)
        expect(poissonAtLeast(1, 1)).toBeCloseTo(0.6321, 4)
    })

    it('expectedHalfConceded equals the direct sum of floor(g/2) weighted by the pmf', () => {
        let direct = 0

        for (let g = 0; g <= 30; g += 1) direct += poissonPmf(g, 1.2) * Math.floor(g / 2)

        expect(expectedHalfConceded(1.2)).toBeCloseTo(direct, 9)
        expect(expectedHalfConceded(0)).toBe(0)
    })
})

describe('averages', () => {
    it('shrunkRate falls back to the prior without exposure and to the sample with plenty', () => {
        expect(shrunkRate(0, 0, 0.4, 3)).toBeCloseTo(0.4, 12)
        expect(shrunkRate(100, 1000, 0.4, 3)).toBeCloseTo(0.1, 2)
    })

    it('weightedMean and decayWeights', () => {
        expect(weightedMean([1, 3], [1, 1])).toBe(2)
        expect(weightedMean([], [])).toBe(0)
        expect(weightedMean([5], [0])).toBe(0)
        expect(decayWeights(3, 0.5)).toEqual([1, 0.5, 0.25])
    })

    it('mean, mae, clamp', () => {
        expect(mean([1, 2, 3])).toBe(2)
        expect(mean([])).toBe(0)
        expect(mae([1, 2], [2, 4])).toBe(1.5)
        expect(clamp(5, 0, 2)).toBe(2)
        expect(clamp(-1, 0, 2)).toBe(0)
    })
})

describe('spearman', () => {
    it('is 1 for the same order and -1 for reversed', () => {
        expect(spearman([1, 2, 3], [10, 20, 30])).toBeCloseTo(1, 12)
        expect(spearman([1, 2, 3], [30, 20, 10])).toBeCloseTo(-1, 12)
    })

    it('uses average ranks for ties', () => {
        expect(spearman([1, 1, 2], [1, 2, 3])).toBeCloseTo(0.866, 3)
    })

    it('is 0 for fewer than two points or no variance', () => {
        expect(spearman([1], [1])).toBe(0)
        expect(spearman([2, 2, 2], [1, 2, 3])).toBe(0)
    })
})

describe('fitLinear', () => {
    it('recovers a line', () => {
        const fit = fitLinear([0, 1, 2, 3], [1, 3, 5, 7])

        expect(fit.slope).toBeCloseTo(2, 12)
        expect(fit.intercept).toBeCloseTo(1, 12)
    })

    it('constant x gives slope 0 and the mean of y as intercept', () => {
        expect(fitLinear([1, 1, 1], [2, 4, 6])).toEqual({ intercept: 4, slope: 0 })
    })
})

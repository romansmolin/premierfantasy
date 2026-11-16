import { describe, expect, it } from 'vitest'

import { outcomeProbabilities } from './outcome'

describe('outcomeProbabilities', () => {
    it('is symmetric for equal xG with a ~30.85% draw', () => {
        const o = outcomeProbabilities(1, 1)

        expect(o.home).toBeCloseTo(o.away, 12)
        expect(o.draw).toBeCloseTo(0.3085, 3)
    })

    it('favours the stronger side', () => {
        expect(outcomeProbabilities(2.5, 0.5).home).toBeGreaterThan(0.7)
    })

    it('sums to 1', () => {
        const o = outcomeProbabilities(1.7, 0.9)

        expect(Math.abs(o.home + o.draw + o.away - 1)).toBeLessThan(1e-12)
    })
})

import { describe, expect, it } from 'vitest'

import { bestIndexes, canCompare } from './compare'

describe('bestIndexes', () => {
    it('returns every index that ties for the best value', () => {
        expect(bestIndexes([3, null, 5, 5], true)).toEqual([2, 3])
    })

    it('never highlights a lone value or a null', () => {
        expect(bestIndexes([null, 4], true)).toEqual([])
        expect(bestIndexes([null, null], true)).toEqual([])
    })

    it('highlights nothing when all values are equal', () => {
        expect(bestIndexes([2, 2], true)).toEqual([])
    })

    it('picks the minimum when lower is better', () => {
        expect(bestIndexes([4, 2, 9], false)).toEqual([1])
    })
})

describe('canCompare', () => {
    const a = { id: 'a', position: 'MID' as const }
    const b = { id: 'b', position: 'MID' as const }
    const c = { id: 'c', position: 'MID' as const }

    it('accepts a player of the same position', () => {
        expect(canCompare([a], b)).toEqual({ ok: true })
        expect(canCompare([], a)).toEqual({ ok: true })
    })

    it('rejects a fourth player with the maximum in the reason', () => {
        const result = canCompare([a, b, c], { id: 'd', position: 'MID' })

        expect(result.ok).toBe(false)
        expect(!result.ok && result.reason).toMatch(/3/)
    })

    it('rejects a player of another position', () => {
        const result = canCompare([a], { id: 'f', position: 'FWD' })

        expect(result.ok).toBe(false)
        expect(!result.ok && result.reason).toMatch(/position/)
    })

    it('rejects a player who is already selected', () => {
        expect(canCompare([a], a).ok).toBe(false)
    })
})

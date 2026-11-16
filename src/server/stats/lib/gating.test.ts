import { describe, expect, it } from 'vitest'

import { fixtureHorizons, gated, gateHorizon } from './gating'

const d = (n: number) => new Date(Date.UTC(2026, 8, n))

describe('gating', () => {
    it('gated hides a value when the gate is off', () => {
        expect(gated(0.4, false)).toBeNull()
        expect(gated(0.4, true)).toBe(0.4)
        expect(gated(null, true)).toBeNull()
    })

    it('horizon 1 is next, later ones share the later gate', () => {
        expect(gateHorizon(1)).toBe('next')
        expect(gateHorizon(2)).toBe('later')
    })

    it('indexes fixtures per club in kickoff order', () => {
        const h = fixtureHorizons([
            { id: 'b', kickoff: d(5), homeId: 'A', awayId: 'C' },
            { id: 'a', kickoff: d(1), homeId: 'A', awayId: 'B' },
        ])

        expect(h.get('a')).toBe(1)
        expect(h.get('b')).toBe(2)
    })
})

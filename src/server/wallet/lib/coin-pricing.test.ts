import { describe, expect, it } from 'vitest'

import { COIN_PACKS } from './coin-pricing'

describe('COIN_PACKS labels', () => {
    it('call the unit Credits, never coins', () => {
        for (const pack of COIN_PACKS) {
            expect(pack.label).toMatch(/credits/i)
            expect(pack.label).not.toMatch(/coin/i)
        }
    })
})

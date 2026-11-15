import { describe, expect, it } from 'vitest'

import { parseRoundNumber } from './round'

describe('parseRoundNumber', () => {
    it('reads the number from a regular season round', () => {
        expect(parseRoundNumber('Regular Season - 11')).toBe(11)
        expect(parseRoundNumber('Regular Season - 1')).toBe(1)
    })

    it('returns null for rounds without a number', () => {
        expect(parseRoundNumber('Quarter-finals')).toBeNull()
    })
})

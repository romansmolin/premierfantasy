import { describe, expect, it } from 'vitest'

import { formatChance } from './format-chance'

describe('formatChance', () => {
    it('formats null, the tails and the middle', () => {
        expect(formatChance(null)).toBe('—')
        expect(formatChance(0.004)).toBe('<1%')
        expect(formatChance(0.996)).toBe('>99%')
        expect(formatChance(0.424)).toBe('42%')
    })
})

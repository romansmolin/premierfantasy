import { describe, expect, it } from 'vitest'

import { formatMinutes, formatPoints } from './format'

describe('formatMinutes', () => {
    it('rounds to whole minutes', () => expect(formatMinutes(78.4)).toBe('78'))
    it('shows a dash for null, never 0', () => expect(formatMinutes(null)).toBe('—'))
})

describe('formatPoints', () => {
    it('keeps one decimal', () => expect(formatPoints(5.84)).toBe('5.8'))
    it('shows a dash for null', () => expect(formatPoints(null)).toBe('—'))
})

import { describe, expect, it } from 'vitest'

import { formatIsoDate, parseIsoDate } from './iso-date'

describe('iso date helpers', () => {
    it('round-trips a date without shifting the day', () => {
        expect(formatIsoDate(parseIsoDate('1990-01-01')!)).toBe('1990-01-01')
        expect(formatIsoDate(parseIsoDate('2024-12-31')!)).toBe('2024-12-31')
    })

    it('rejects empty, malformed and overflowing values', () => {
        expect(parseIsoDate('')).toBeUndefined()
        expect(parseIsoDate(undefined)).toBeUndefined()
        expect(parseIsoDate('01/01/1990')).toBeUndefined()
        expect(parseIsoDate('2024-02-31')).toBeUndefined()
    })
})

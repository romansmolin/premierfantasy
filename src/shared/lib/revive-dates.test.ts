import { describe, expect, it } from 'vitest'

import { reviveDates } from './revive-dates'

describe('reviveDates', () => {
    it('turns ISO timestamps anywhere in the tree into Dates', () => {
        const out = reviveDates<{ a: { when: Date }[]; at: Date }>({
            a: [{ when: '2026-11-21T15:00:00.000Z' }],
            at: '2026-11-16T12:00:00Z',
        })

        expect(out.a[0].when).toBeInstanceOf(Date)
        expect(out.a[0].when.toISOString()).toBe('2026-11-21T15:00:00.000Z')
        expect(out.at).toBeInstanceOf(Date)
    })

    it('leaves other strings, numbers, booleans and null alone', () => {
        const input = { name: 'Arsenal', n: 3, ok: true, none: null, id: '2026-11-21' }

        expect(reviveDates(input)).toEqual(input)
    })
})

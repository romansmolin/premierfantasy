import { describe, expect, it } from 'vitest'

import { getCountryOptions } from './countries'

describe('getCountryOptions', () => {
    const options = getCountryOptions()

    it('has unique two-letter codes with readable names', () => {
        expect(new Set(options.map((o) => o.value)).size).toBe(options.length)
        expect(options.every((o) => /^[A-Z]{2}$/.test(o.value) && o.label !== o.value)).toBe(true)
        expect(options.find((o) => o.value === 'PL')?.label).toBe('Poland')
    })

    it('is sorted by name', () => {
        const labels = options.map((o) => o.label)

        expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'en')))
    })
})

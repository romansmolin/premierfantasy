import { describe, expect, it } from 'vitest'

import { sameCustomer } from './same-customer'

const base = {
    firstName: 'Alex',
    lastName: 'Smith',
    email: 'alex@example.test',
    phone: '+48123456789',
    address: 'Example Street 1',
    city: 'Warsaw',
    country: 'PL',
    zip: '00-001',
    birthDate: '',
}

describe('sameCustomer', () => {
    it('treats a missing birth date as empty', () => {
        expect(sameCustomer(base, { ...base, birthDate: undefined })).toBe(true)
    })

    it('detects any changed field', () => {
        expect(sameCustomer(base, { ...base, city: 'Krakow' })).toBe(false)
        expect(sameCustomer(base, { ...base, birthDate: '1990-01-01' })).toBe(false)
    })
})

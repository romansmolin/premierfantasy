import { describe, expect, it, vi } from 'vitest'

import { BillingService } from './billing.service'

import type { IBillingRepository } from '../repository/billing.repository.interface'

const customer = {
    firstName: 'Alex',
    lastName: 'Smith',
    email: 'alex@example.test',
    phone: '+48123456789',
    address: 'Example Street 1',
    city: 'Warsaw',
    country: 'pl',
    zip: '00-001',
}

const makeRepo = () =>
    ({
        findByUserId: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockImplementation(async (_id: string, c: unknown) => c),
    }) satisfies IBillingRepository

describe('BillingService', () => {
    it('returns null for a user without a saved profile', async () => {
        const repo = makeRepo()

        expect(await new BillingService(repo).getProfile('u1')).toBeNull()
        expect(repo.findByUserId).toHaveBeenCalledWith('u1')
    })

    it('saves under the given user with an upper-case country and an empty birth date by default', async () => {
        const repo = makeRepo()

        await new BillingService(repo).saveProfile('u1', customer)

        expect(repo.upsert).toHaveBeenCalledWith('u1', { ...customer, country: 'PL', birthDate: '' })
    })
})

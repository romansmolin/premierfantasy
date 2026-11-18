import { NextRequest, NextResponse } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

import { BillingController } from './billing.controller'

import type { IBillingService } from '../service/billing.service.interface'

const customer = {
    firstName: 'Alex',
    lastName: 'Smith',
    email: 'alex@example.test',
    phone: '+48123456789',
    address: 'Example Street 1',
    city: 'Warsaw',
    country: 'PL',
    zip: '00-001',
    birthDate: '1990-01-01',
}

const authState = vi.hoisted(() => ({ userId: "user-1" as string | object }))

vi.mock('@/shared/lib/auth-helpers', () => ({
    requireUserId: vi.fn(async () => authState.userId),
    isAuthError: (value: unknown) => typeof value === "object",
}))

const context = { params: Promise.resolve({}) }
const put = (body: unknown) =>
    new NextRequest('http://localhost/api/billing/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    })

const makeService = () =>
    ({
        getProfile: vi.fn().mockResolvedValue(customer),
        saveProfile: vi.fn().mockImplementation(async (_id: string, c: unknown) => c),
    }) satisfies IBillingService

describe('BillingController', () => {
    it('returns only the signed-in user\'s profile, uncached', async () => {
        authState.userId = 'user-1'

        const service = makeService()
        const res = await new BillingController(service).getProfile(
            new NextRequest('http://localhost/api/billing/profile'),
            context,
        )

        expect(service.getProfile).toHaveBeenCalledWith('user-1')
        expect(await res.json()).toEqual({ profile: customer })
        expect(res.headers.get('cache-control')).toContain('no-store')
    })

    it('saves a valid profile for the session user', async () => {
        authState.userId = 'user-1'

        const service = makeService()
        const res = await new BillingController(service).saveProfile(put(customer), context)

        expect(res.status).toBe(200)
        expect(service.saveProfile).toHaveBeenCalledWith('user-1', customer)
    })

    it('rejects an invalid profile without saving', async () => {
        authState.userId = 'user-1'

        const service = makeService()
        const res = await new BillingController(service).saveProfile(put({ ...customer, country: 'Poland' }), context)

        expect(res.status).toBe(400)
        expect(service.saveProfile).not.toHaveBeenCalled()
    })

    it('does not touch the service when unauthenticated', async () => {
        authState.userId = NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const service = makeService()
        const controller = new BillingController(service)

        expect((await controller.getProfile(new NextRequest('http://localhost/x'), context)).status).toBe(401)
        expect((await controller.saveProfile(put(customer), context)).status).toBe(401)
        expect(service.getProfile).not.toHaveBeenCalled()
        expect(service.saveProfile).not.toHaveBeenCalled()
    })
})

import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

import { PaymentController } from './payment.controller'

import type { IPaymentService } from '../service/payment.service.interface'

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

vi.mock('@/shared/lib/auth-helpers', () => ({
    requireUserId: vi.fn().mockResolvedValue('user-1'),
    isAuthError: vi.fn().mockReturnValue(false),
}))

describe('payment checkout consent', () => {
    it.each([
        ['pack', 'createCheckout', { coinAmount: 100 }],
        ['custom amount', 'createCustomCheckout', { amountCents: 200 }],
    ] as const)('requires explicit consent for %s checkout', async (_label, method, body) => {
        const service = { [method]: vi.fn().mockResolvedValue({ redirectUrl: 'https://example.test' }) }
        const controller = new PaymentController(service as unknown as IPaymentService)
        const request = (consent?: boolean) =>
            new NextRequest('http://localhost/api/payments/checkout', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ...body, customer, withdrawalConsent: consent }),
            })
        const context = { params: Promise.resolve({}) }

        const missingCustomer = new NextRequest('http://localhost/api/payments/checkout', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ...body, withdrawalConsent: true }),
        })

        expect((await controller[method](missingCustomer, context)).status).toBe(400)
        expect((await controller[method](request(), context)).status).toBe(400)
        expect((await controller[method](request(false), context)).status).toBe(400)
        expect(service[method]).not.toHaveBeenCalled()
        expect((await controller[method](request(true), context)).status).toBe(200)
        expect(service[method]).toHaveBeenCalledWith('user-1', Object.values(body)[0], customer)
    })
})

describe('payment confirmation download', () => {
    it('only downloads a completed payment and includes the recorded consent', async () => {
        const payment = {
            id: 'pay-1',
            status: 'PENDING',
            amountCents: 200,
            currency: 'EUR',
            coinAmount: 100,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:00:00Z'),
            withdrawalConsentAt: new Date('2026-01-01T00:00:00Z'),
            withdrawalConsentText: 'Consent text',
        }
        const getPaymentForUser = vi.fn().mockResolvedValue(payment)
        const controller = new PaymentController({ getPaymentForUser } as unknown as IPaymentService)
        const request = new NextRequest('http://localhost/api/payments/secure-processor/pay-1/receipt')
        const context = { params: Promise.resolve({ token: 'pay-1' }) }

        expect((await controller.downloadReceipt(request, context)).status).toBe(404)
        payment.status = 'SUCCESSFUL'
        const response = await controller.downloadReceipt(request, context)

        expect(response.status).toBe(200)
        expect(response.headers.get('content-disposition')).toContain('attachment')
        expect(await response.text()).toContain('Consent text')
        expect(getPaymentForUser).toHaveBeenCalledWith('user-1', 'pay-1')
    })
})

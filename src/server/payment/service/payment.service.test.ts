import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MAX_TOPUP_CENTS, MIN_TOPUP_CENTS } from '@/entities/wallet/model/coin-pricing'
import { WITHDRAWAL_CONSENT_TEXT } from '@/entities/wallet/model/withdrawal-consent'

import type { AppError } from '@/shared/lib/http'

import { PaymentService } from './payment.service'

import type { IPaymentRepository, PaymentTokenRecord } from '../repository/payment.repository.interface'
import type { IWalletRepository } from '@/server/wallet/repository/wallet.repository.interface'

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

const createCheckoutMock = vi.hoisted(() => vi.fn())

vi.mock('@/shared/api/secure-processor-client', () => ({
    secureProcessorClient: { createCheckout: createCheckoutMock },
    verifyWebhookBasicAuth: vi.fn(),
    verifyWebhookSignature: vi.fn(),
}))

const paymentRecord = (overrides: Partial<PaymentTokenRecord> = {}): PaymentTokenRecord => ({
    id: 'pay-1',
    userId: 'user-1',
    token: 'token-1',
    gatewayUid: null,
    status: 'CREATED',
    amountCents: 4365,
    currency: 'EUR',
    coinAmount: 3470,
    description: 'Purchase 3470 coins',
    withdrawalConsentAt: null,
    withdrawalConsentText: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

const makeDeps = () => {
    const paymentRepository = {
        create: vi.fn().mockImplementation(async (data) => paymentRecord(data)),
        updateStatus: vi.fn().mockResolvedValue(paymentRecord()),
        findByToken: vi.fn(),
        findById: vi.fn(),
        findByUserId: vi.fn(),
    }

    const walletRepository = {} as IWalletRepository

    const service = new PaymentService(paymentRepository as unknown as IPaymentRepository, walletRepository)

    return { service, paymentRepository }
}

const statusOf = async (promise: Promise<unknown>): Promise<number> => {
    try {
        await promise

        throw new Error('expected the call to reject')
    } catch (error) {
        return (error as AppError).statusCode
    }
}

describe('PaymentService.createCustomCheckout', () => {
    let deps: ReturnType<typeof makeDeps>

    beforeEach(() => {
        deps = makeDeps()
        createCheckoutMock.mockReset()
        createCheckoutMock.mockResolvedValue({ token: 'gw-1', redirectUrl: 'https://pay.example/1' })
    })

    it('charges the requested money and derives the coins server-side', async () => {
        const result = await deps.service.createCustomCheckout('user-1', 4365, customer)

        expect(result.redirectUrl).toBe('https://pay.example/1')
        expect(deps.paymentRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'user-1',
                withdrawalConsentAt: expect.any(Date),
                withdrawalConsentText: WITHDRAWAL_CONSENT_TEXT,
                amountCents: 4365,
                currency: 'EUR',
                coinAmount: 3470,
            }),
        )
        expect(createCheckoutMock).toHaveBeenCalledWith(
            expect.objectContaining({ amountCents: 4365, currency: 'EUR', customer }),
        )
    })

    it('quotes a custom amount identically to the equivalent coin pack', async () => {
        await deps.service.createCustomCheckout('user-1', 800, customer)

        expect(deps.paymentRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ amountCents: 800, coinAmount: 500 }),
        )
    })

    it('ignores any coin count the caller might try to supply', async () => {
        // The server calculates the coin count from the amount.
        await deps.service.createCustomCheckout('user-1', 200, customer)

        const created = deps.paymentRepository.create.mock.calls[0][0]

        expect(created.coinAmount).toBe(100)
    })

    it('rejects an amount below the minimum', async () => {
        await expect(
            statusOf(deps.service.createCustomCheckout('user-1', MIN_TOPUP_CENTS - 1, customer)),
        ).resolves.toBe(400)

        expect(createCheckoutMock).not.toHaveBeenCalled()
    })

    it('rejects an amount above the maximum', async () => {
        await expect(
            statusOf(deps.service.createCustomCheckout('user-1', MAX_TOPUP_CENTS + 1, customer)),
        ).resolves.toBe(400)

        expect(deps.paymentRepository.create).not.toHaveBeenCalled()
    })

    it('rejects fractional cents', async () => {
        await expect(statusOf(deps.service.createCustomCheckout('user-1', 100.5, customer))).resolves.toBe(
            400,
        )
    })

    it('rejects zero and negative amounts', async () => {
        await expect(statusOf(deps.service.createCustomCheckout('user-1', 0, customer))).resolves.toBe(400)
        await expect(statusOf(deps.service.createCustomCheckout('user-1', -500, customer))).resolves.toBe(400)
    })

    it('marks the payment failed when the processor rejects the checkout', async () => {
        createCheckoutMock.mockRejectedValue(new Error('gateway down'))

        await expect(deps.service.createCustomCheckout('user-1', 1000, customer)).rejects.toThrow(
            'gateway down',
        )
        expect(deps.paymentRepository.updateStatus).toHaveBeenCalledWith('pay-1', 'FAILED')
    })

    it('moves the payment to PENDING once the processor accepts it', async () => {
        await deps.service.createCustomCheckout('user-1', 1000, customer)

        expect(deps.paymentRepository.updateStatus).toHaveBeenCalledWith('pay-1', 'PENDING', 'gw-1')
    })
})

describe('PaymentService.createCheckout', () => {
    it('passes the entered customer details to the processor for a fixed pack', async () => {
        const { service } = makeDeps()

        createCheckoutMock.mockReset()
        createCheckoutMock.mockResolvedValue({ token: 'gw-1', redirectUrl: 'https://pay.example/1' })
        await service.createCheckout('user-1', 100, customer)
        expect(createCheckoutMock).toHaveBeenCalledWith(
            expect.objectContaining({ customer, amountCents: 200 }),
        )
    })
})

describe('PaymentService.getPaymentForUser', () => {
    it('only returns a payment belonging to the signed-in user', async () => {
        const { service, paymentRepository } = makeDeps()

        paymentRepository.findById.mockResolvedValue(paymentRecord())
        await expect(service.getPaymentForUser('user-1', 'pay-1')).resolves.toMatchObject({
            id: 'pay-1',
            amountCents: 4365,
        })
        await expect(service.getPaymentForUser('another-user', 'pay-1')).rejects.toMatchObject({
            statusCode: 404,
        })
    })
})

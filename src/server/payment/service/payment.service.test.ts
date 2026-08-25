import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MAX_TOPUP_CENTS, MIN_TOPUP_CENTS } from '@/entities/wallet/model/coin-pricing'

import type { AppError } from '@/shared/lib/http'

import { PaymentService } from './payment.service'

import type { IPaymentRepository, PaymentTokenRecord } from '../repository/payment.repository.interface'
import type { IWalletRepository } from '@/server/wallet/repository/wallet.repository.interface'

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
        const result = await deps.service.createCustomCheckout('user-1', 4365)

        expect(result.redirectUrl).toBe('https://pay.example/1')
        expect(deps.paymentRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'user-1',
                amountCents: 4365,
                currency: 'EUR',
                coinAmount: 3470,
            }),
        )
        expect(createCheckoutMock).toHaveBeenCalledWith(
            expect.objectContaining({ amountCents: 4365, currency: 'EUR' }),
        )
    })

    it('quotes a custom amount identically to the equivalent coin pack', async () => {
        await deps.service.createCustomCheckout('user-1', 800)

        expect(deps.paymentRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ amountCents: 800, coinAmount: 500 }),
        )
    })

    it('ignores any coin count the caller might try to supply', async () => {
        // The signature only accepts money — this documents that contract.
        await deps.service.createCustomCheckout('user-1', 200)

        const created = deps.paymentRepository.create.mock.calls[0][0]

        expect(created.coinAmount).toBe(100)
    })

    it('rejects an amount below the minimum', async () => {
        await expect(
            statusOf(deps.service.createCustomCheckout('user-1', MIN_TOPUP_CENTS - 1)),
        ).resolves.toBe(400)

        expect(createCheckoutMock).not.toHaveBeenCalled()
    })

    it('rejects an amount above the maximum', async () => {
        await expect(
            statusOf(deps.service.createCustomCheckout('user-1', MAX_TOPUP_CENTS + 1)),
        ).resolves.toBe(400)

        expect(deps.paymentRepository.create).not.toHaveBeenCalled()
    })

    it('rejects fractional cents', async () => {
        await expect(statusOf(deps.service.createCustomCheckout('user-1', 100.5))).resolves.toBe(400)
    })

    it('rejects zero and negative amounts', async () => {
        await expect(statusOf(deps.service.createCustomCheckout('user-1', 0))).resolves.toBe(400)
        await expect(statusOf(deps.service.createCustomCheckout('user-1', -500))).resolves.toBe(400)
    })

    it('marks the payment failed when the processor rejects the checkout', async () => {
        createCheckoutMock.mockRejectedValue(new Error('gateway down'))

        await expect(deps.service.createCustomCheckout('user-1', 1000)).rejects.toThrow('gateway down')
        expect(deps.paymentRepository.updateStatus).toHaveBeenCalledWith('pay-1', 'FAILED')
    })

    it('moves the payment to PENDING once the processor accepts it', async () => {
        await deps.service.createCustomCheckout('user-1', 1000)

        expect(deps.paymentRepository.updateStatus).toHaveBeenCalledWith('pay-1', 'PENDING', 'gw-1')
    })
})

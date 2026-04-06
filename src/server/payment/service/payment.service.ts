import { getCoinPack } from '@/server/wallet/lib/coin-pricing'

import { secureProcessorClient } from '@/shared/api/secure-processor-client'

import type { IPaymentService } from './payment.service.interface'
import type { IPaymentRepository } from '../repository/payment.repository.interface'
import type { IWalletRepository } from '@/server/wallet/repository/wallet.repository.interface'

export class PaymentService implements IPaymentService {
    private readonly paymentRepository: IPaymentRepository
    private readonly walletRepository: IWalletRepository

    constructor(paymentRepository: IPaymentRepository, walletRepository: IWalletRepository) {
        this.paymentRepository = paymentRepository
        this.walletRepository = walletRepository
    }

    async createCheckout(userId: string, coinAmount: number): Promise<{ redirectUrl: string }> {
        const pack = getCoinPack(coinAmount)

        if (!pack) throw new Error(`Invalid coin amount: ${coinAmount}`)

        const trackingId = crypto.randomUUID()

        const payment = await this.paymentRepository.create({
            userId,
            token: trackingId,
            amountCents: pack.priceCents,
            currency: pack.currency,
            coinAmount: pack.coins,
            description: `Purchase ${pack.coins} coins`,
        })

        try {
            const checkout = await secureProcessorClient.createCheckout({
                amountCents: pack.priceCents,
                currency: pack.currency,
                description: `Purchase ${pack.coins} Premier Fantasy coins`,
                trackingId: payment.id,
                userId,
            })

            await this.paymentRepository.updateStatus(payment.id, 'PENDING', checkout.token)

            return { redirectUrl: checkout.redirectUrl }
        } catch (error) {
            await this.paymentRepository.updateStatus(payment.id, 'FAILED')

            throw error
        }
    }

    async handleWebhook(rawBody: string, signature: string): Promise<void> {
        const { verifyWebhookSignature } = await import('@/shared/api/secure-processor-client')

        const isValid = verifyWebhookSignature(rawBody, signature)

        if (!isValid) throw new Error('Invalid webhook signature')

        const payload = JSON.parse(rawBody)
        const transaction = payload.transaction ?? payload
        const trackingId =
            transaction?.tracking_id ??
            transaction?.order?.tracking_id ??
            payload?.metadata?.payment_token_id ??
            transaction?.metadata?.payment_token_id
        const status = transaction?.status ?? payload?.status

        if (!trackingId) throw new Error('Missing tracking_id in webhook')

        const payment = await this.paymentRepository.findById(trackingId)

        if (!payment) throw new Error(`Payment not found: ${trackingId}`)

        if (payment.status === 'SUCCESSFUL') return

        if (status === 'successful') {
            await this.paymentRepository.updateStatus(payment.id, 'SUCCESSFUL', transaction?.uid)

            await this.walletRepository.createTransaction({
                userId: payment.userId,
                amount: payment.coinAmount,
                type: 'PURCHASE',
                description: `Purchased ${payment.coinAmount} coins`,
            })
        } else if (status === 'failed' || status === 'error') {
            await this.paymentRepository.updateStatus(payment.id, 'FAILED', transaction?.uid)
        }
    }
}

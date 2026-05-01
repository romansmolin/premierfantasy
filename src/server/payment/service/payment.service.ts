import { getCoinPack } from '@/server/wallet/lib/coin-pricing'

import {
    secureProcessorClient,
    verifyWebhookBasicAuth,
    verifyWebhookSignature,
} from '@/shared/api/secure-processor-client'

import type { IPaymentService } from './payment.service.interface'
import type { IPaymentRepository } from '../repository/payment.repository.interface'
import type { IWalletRepository } from '@/server/wallet/repository/wallet.repository.interface'

type NormalizedStatus = 'CREATED' | 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'DECLINED' | 'EXPIRED' | 'ERROR'

const normalizeStatus = (status?: string | null): NormalizedStatus => {
    const normalized = (status ?? '').toLowerCase()
    if (['successful', 'success', 'completed', 'paid', 'approved'].includes(normalized)) return 'SUCCESSFUL'
    if (['failed', 'failure'].includes(normalized)) return 'FAILED'
    if (['declined', 'rejected', 'canceled', 'cancelled'].includes(normalized)) return 'DECLINED'
    if (normalized === 'expired') return 'EXPIRED'
    if (normalized === 'error') return 'ERROR'
    if (['pending', 'processing', 'incomplete', 'awaiting', ''].includes(normalized)) return 'PENDING'
    return 'PENDING'
}

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

    async handleWebhook(
        rawBody: string,
        headers: { authorization: string | null; signature: string | null },
    ): Promise<void> {
        if (!verifyWebhookBasicAuth(headers.authorization)) {
            throw new Error('Invalid webhook authorization')
        }

        if (!headers.signature || !verifyWebhookSignature(rawBody, headers.signature)) {
            throw new Error('Invalid webhook signature')
        }

        const payload = JSON.parse(rawBody)
        const transaction = payload.transaction ?? payload
        const trackingId =
            transaction?.tracking_id ??
            transaction?.order?.tracking_id ??
            payload?.metadata?.payment_token_id ??
            transaction?.metadata?.payment_token_id
        const rawStatus = transaction?.status ?? payload?.status

        if (!trackingId) throw new Error('Missing tracking_id in webhook')

        const payment = await this.paymentRepository.findById(trackingId)

        if (!payment) throw new Error(`Payment not found: ${trackingId}`)

        // Cross-check amount and currency against the stored record.
        const order = transaction?.order ?? payload?.order ?? {}
        const webhookAmount =
            typeof order.amount === 'number'
                ? order.amount
                : typeof transaction?.amount === 'number'
                  ? transaction.amount
                  : null
        const webhookCurrency = order.currency ?? transaction?.currency ?? null
        if (webhookAmount !== null && webhookAmount !== payment.amountCents) {
            await this.paymentRepository.updateStatus(payment.id, 'ERROR', transaction?.uid)
            throw new Error('Webhook amount mismatch')
        }
        if (webhookCurrency && webhookCurrency !== payment.currency) {
            await this.paymentRepository.updateStatus(payment.id, 'ERROR', transaction?.uid)
            throw new Error('Webhook currency mismatch')
        }

        if (payment.status === 'SUCCESSFUL') return

        const status = normalizeStatus(rawStatus)

        if (status === 'SUCCESSFUL') {
            await this.paymentRepository.updateStatus(payment.id, 'SUCCESSFUL', transaction?.uid)

            await this.walletRepository.createTransaction({
                userId: payment.userId,
                amount: payment.coinAmount,
                type: 'PURCHASE',
                description: `Purchased ${payment.coinAmount} coins`,
                paymentTokenId: payment.id,
            })
        } else if (
            status === 'FAILED' ||
            status === 'ERROR' ||
            status === 'DECLINED' ||
            status === 'EXPIRED'
        ) {
            await this.paymentRepository.updateStatus(payment.id, status, transaction?.uid)
        }
    }

    async reconcileReturn(trackingId: string): Promise<{ status: 'SUCCESSFUL' | 'PENDING' | 'FAILED' }> {
        const payment = await this.paymentRepository.findById(trackingId)
        if (!payment) throw new Error(`Payment not found: ${trackingId}`)

        if (!payment.gatewayUid) {
            return { status: payment.status === 'SUCCESSFUL' ? 'SUCCESSFUL' : 'PENDING' }
        }

        const remote = await secureProcessorClient.queryCheckout(payment.gatewayUid)

        if (remote.amountCents !== null && remote.amountCents !== payment.amountCents) {
            await this.paymentRepository.updateStatus(payment.id, 'ERROR', remote.uid ?? undefined)
            return { status: 'FAILED' }
        }
        if (remote.currency && remote.currency !== payment.currency) {
            await this.paymentRepository.updateStatus(payment.id, 'ERROR', remote.uid ?? undefined)
            return { status: 'FAILED' }
        }

        const status = normalizeStatus(remote.status)

        if (status === 'SUCCESSFUL' && payment.status !== 'SUCCESSFUL') {
            await this.paymentRepository.updateStatus(payment.id, 'SUCCESSFUL', remote.uid ?? undefined)
            await this.walletRepository.createTransaction({
                userId: payment.userId,
                amount: payment.coinAmount,
                type: 'PURCHASE',
                description: `Purchased ${payment.coinAmount} coins`,
                paymentTokenId: payment.id,
            })
            return { status: 'SUCCESSFUL' }
        }

        if (status === 'PENDING') {
            return { status: 'PENDING' }
        }

        await this.paymentRepository.updateStatus(payment.id, status, remote.uid ?? undefined)
        return { status: 'FAILED' }
    }
}

import { getCoinPack } from '@/server/wallet/lib/coin-pricing'

import {
    secureProcessorClient,
    verifyWebhookBasicAuth,
    verifyWebhookSignature,
} from '@/shared/api/secure-processor-client'
import { Errors } from '@/shared/lib/http'

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

        if (!pack) throw Errors.badRequest(`Invalid coin amount: ${coinAmount}`)

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
            throw Errors.unauthorized('Invalid webhook authorization')
        }

        if (!headers.signature || !verifyWebhookSignature(rawBody, headers.signature)) {
            throw Errors.unauthorized('Invalid webhook signature')
        }

        let payload: unknown

        try {
            payload = JSON.parse(rawBody)
        } catch {
            throw Errors.badRequest('Webhook body is not valid JSON')
        }

        const data = payload as Record<string, unknown>
        const transaction = (data.transaction ?? data) as Record<string, unknown>
        const order = ((transaction.order ?? data.order) as Record<string, unknown> | undefined) ?? {}
        const metadata = (data.metadata ?? transaction.metadata) as Record<string, unknown> | undefined
        const trackingId =
            (transaction.tracking_id as string | undefined) ??
            (order.tracking_id as string | undefined) ??
            (metadata?.payment_token_id as string | undefined)
        const rawStatus = (transaction.status ?? data.status) as string | undefined

        if (!trackingId) throw Errors.badRequest('Missing tracking_id in webhook')

        const payment = await this.paymentRepository.findById(trackingId)

        if (!payment) throw Errors.badRequest(`Payment not found: ${trackingId}`)

        const webhookAmount =
            typeof order.amount === 'number'
                ? order.amount
                : typeof transaction.amount === 'number'
                  ? (transaction.amount as number)
                  : null
        const webhookCurrency = (order.currency ?? transaction.currency) as string | undefined
        const txUid = transaction.uid as string | undefined

        if (webhookAmount !== null && webhookAmount !== payment.amountCents) {
            await this.paymentRepository.updateStatus(payment.id, 'ERROR', txUid)
            throw Errors.unprocessable('Webhook amount mismatch')
        }

        if (webhookCurrency && webhookCurrency !== payment.currency) {
            await this.paymentRepository.updateStatus(payment.id, 'ERROR', txUid)
            throw Errors.unprocessable('Webhook currency mismatch')
        }

        if (payment.status === 'SUCCESSFUL') return

        const status = normalizeStatus(rawStatus)

        if (status === 'SUCCESSFUL') {
            await this.paymentRepository.updateStatus(payment.id, 'SUCCESSFUL', txUid)

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
            await this.paymentRepository.updateStatus(payment.id, status, txUid)
        }
    }

    async reconcileReturn(trackingId: string): Promise<{ status: 'SUCCESSFUL' | 'PENDING' | 'FAILED' }> {
        const payment = await this.paymentRepository.findById(trackingId)

        if (!payment) throw Errors.notFound(`Payment not found: ${trackingId}`)

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

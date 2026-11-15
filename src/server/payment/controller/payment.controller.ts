import { NextResponse } from 'next/server'
import { z } from 'zod'

import { COMPANY } from '@/shared/config/company'
import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { AppError, Errors, parseJson, withController } from '@/shared/lib/http'
import { checkoutCustomerSchema } from '@/shared/model/checkout-customer'

import type { IPaymentService } from '../service/payment.service.interface'

const checkoutSchema = z.object({
    coinAmount: z.number().int().positive(),
    withdrawalConsent: z.literal(true),
    customer: checkoutCustomerSchema,
})

// Only the amount of money crosses the wire — the coin count is server-derived.
const customCheckoutSchema = z.object({
    amountCents: z.number().int().positive(),
    withdrawalConsent: z.literal(true),
    customer: checkoutCustomerSchema,
})

export class PaymentController {
    private readonly paymentService: IPaymentService

    constructor(paymentService: IPaymentService) {
        this.paymentService = paymentService
    }

    createCheckout = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { coinAmount, customer } = await parseJson(req, checkoutSchema)

        return this.paymentService.createCheckout(userId, coinAmount, customer)
    })

    createCustomCheckout = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { amountCents, customer } = await parseJson(req, customCheckoutSchema)

        return this.paymentService.createCustomCheckout(userId, amountCents, customer)
    })

    getStatus = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { token } = await ctx.params
        const payment = await this.paymentService.getPaymentForUser(userId, token)

        return {
            status: payment.status,
            amountCents: payment.amountCents,
            currency: payment.currency,
            updatedAt: payment.updatedAt,
        }
    })

    downloadReceipt = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { token } = await ctx.params
        const payment = await this.paymentService.getPaymentForUser(userId, token)

        if (payment.status !== 'SUCCESSFUL') throw Errors.notFound('Completed payment not found')

        const lines = [
            'Premier Fantasy - Purchase confirmation',
            '',
            `Merchant: ${COMPANY.name}`,
            `KRS: ${COMPANY.registrationNumber}`,
            `Address: ${COMPANY.address}`,
            'Contact: support@premierfantasy.net',
            `Payment reference: ${payment.id}`,
            `Order created: ${payment.createdAt.toISOString()}`,
            `Amount: ${(payment.amountCents / 100).toFixed(2)} ${payment.currency}`,
            `Credits purchased: ${payment.coinAmount}`,
            `Status: ${payment.status}`,
            '',
            ...(payment.withdrawalConsentAt && payment.withdrawalConsentText
                ? [
                      `Consent recorded: ${payment.withdrawalConsentAt.toISOString()}`,
                      payment.withdrawalConsentText,
                  ]
                : ['No withdrawal consent was recorded for this purchase.']),
            '',
            'Return and refund policy: https://www.premierfantasy.net/return-policy',
        ]

        return new NextResponse(lines.join('\n'), {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': 'attachment; filename="premier-fantasy-purchase.txt"',
                'Cache-Control': 'private, no-store',
                'X-Content-Type-Options': 'nosniff',
            },
        })
    })

    handleWebhook = async (req: Request): Promise<NextResponse> => {
        try {
            const rawBody = await req.text()
            const authorization = req.headers.get('Authorization') ?? req.headers.get('authorization')
            const signature = req.headers.get('Content-Signature') ?? req.headers.get('content-signature')

            await this.paymentService.handleWebhook(rawBody, { authorization, signature })

            return NextResponse.json({ received: true })
        } catch (error) {
            if (error instanceof AppError) {
                return NextResponse.json({ error: error.message }, { status: error.statusCode })
            }

            console.error('Webhook processing error:', error)

            return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
        }
    }

    handleReturn = async (req: Request & { nextUrl: URL }): Promise<NextResponse> => {
        const token = req.nextUrl.searchParams.get('token')
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

        const redirectTo = (destination: 'success' | 'pending' | 'failed', t?: string | null) => {
            const params = new URLSearchParams({ status: destination })

            if (t) params.set('token', t)

            return NextResponse.redirect(
                `${appUrl}/payments/secure-processor/${destination}?${params.toString()}`,
            )
        }

        if (!token) return redirectTo('failed', null)

        try {
            const result = await this.paymentService.reconcileReturn(token)
            const destination =
                result.status === 'SUCCESSFUL'
                    ? 'success'
                    : result.status === 'PENDING'
                      ? 'pending'
                      : 'failed'

            return redirectTo(destination, token)
        } catch (error) {
            console.error('Return reconciliation error:', error)

            return redirectTo('failed', token)
        }
    }
}

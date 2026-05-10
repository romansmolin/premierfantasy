import { NextResponse } from 'next/server'
import { z } from 'zod'

import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { AppError, parseJson, withController } from '@/shared/lib/http'

import type { IPaymentService } from '../service/payment.service.interface'

const checkoutSchema = z.object({
    coinAmount: z.number().int().positive(),
})

export class PaymentController {
    private readonly paymentService: IPaymentService

    constructor(paymentService: IPaymentService) {
        this.paymentService = paymentService
    }

    createCheckout = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { coinAmount } = await parseJson(req, checkoutSchema)

        return this.paymentService.createCheckout(userId, coinAmount)
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

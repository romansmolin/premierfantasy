import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/shared/lib/auth'

import type { IPaymentService } from '../service/payment.service.interface'
import type { NextRequest } from 'next/server'

const checkoutSchema = z.object({
    coinAmount: z.number().int().positive(),
})

export class PaymentController {
    private readonly paymentService: IPaymentService

    constructor(paymentService: IPaymentService) {
        this.paymentService = paymentService
    }

    async createCheckout(req: NextRequest) {
        const session = await auth.api.getSession({ headers: req.headers })

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const parsed = checkoutSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }

        try {
            const result = await this.paymentService.createCheckout(session.user.id, parsed.data.coinAmount)

            return NextResponse.json(result)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create checkout'

            return NextResponse.json({ error: message }, { status: 400 })
        }
    }

    async handleWebhook(req: NextRequest) {
        try {
            const rawBody = await req.text()
            const authorization = req.headers.get('Authorization') ?? req.headers.get('authorization')
            const signature = req.headers.get('Content-Signature') ?? req.headers.get('content-signature')

            await this.paymentService.handleWebhook(rawBody, { authorization, signature })

            return NextResponse.json({ received: true })
        } catch (error) {
            console.error('Webhook error:', error)

            return NextResponse.json({ error: 'Webhook processing failed' }, { status: 401 })
        }
    }

    async handleReturn(req: NextRequest) {
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

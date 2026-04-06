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
            const signature = req.headers.get('content-signature') ?? ''

            if (!signature) {
                return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
            }

            await this.paymentService.handleWebhook(rawBody, signature)

            return NextResponse.json({ success: true })
        } catch (error) {
            console.error('Webhook error:', error)

            const message = error instanceof Error ? error.message : 'Webhook processing failed'

            return NextResponse.json({ error: message }, { status: 400 })
        }
    }
}

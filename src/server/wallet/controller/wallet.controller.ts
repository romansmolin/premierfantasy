import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/shared/lib/auth'

import type { IWalletService } from '../service/wallet.service.interface'

const purchaseSchema = z.object({
    amount: z.number().int().positive(),
})

const spendSchema = z.object({
    amount: z.number().int().positive(),
    feature: z.string().min(1),
})

export class WalletController {
    private readonly walletService

    constructor(walletService: IWalletService) {
        this.walletService = walletService
    }

    private async getUserId(req: NextRequest): Promise<string | null> {
        const session = await auth.api.getSession({ headers: req.headers })

        return session?.user?.id ?? null
    }

    async getWallet(req: NextRequest) {
        const userId = await this.getUserId(req)

        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        try {
            const wallet = await this.walletService.getWallet(userId)

            return NextResponse.json(wallet)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get wallet'

            return NextResponse.json({ error: message }, { status: 500 })
        }
    }

    async purchase(req: NextRequest) {
        const userId = await this.getUserId(req)

        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const parsed = purchaseSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }

        try {
            const wallet = await this.walletService.purchaseCoins(userId, parsed.data.amount)

            return NextResponse.json(wallet)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to purchase coins'

            return NextResponse.json({ error: message }, { status: 400 })
        }
    }

    async spend(req: NextRequest) {
        const userId = await this.getUserId(req)

        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const parsed = spendSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }

        try {
            const wallet = await this.walletService.spendOnFeature(
                userId,
                parsed.data.amount,
                parsed.data.feature,
            )

            return NextResponse.json(wallet)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to spend coins'

            return NextResponse.json({ error: message }, { status: 400 })
        }
    }
}

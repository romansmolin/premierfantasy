import { z } from 'zod'

import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { parseJson, withController } from '@/shared/lib/http'

import type { IWalletService } from '../service/wallet.service.interface'

const purchaseSchema = z.object({
    amount: z.number().int().positive(),
})

const spendSchema = z.object({
    amount: z.number().int().positive(),
    feature: z.string().min(1),
})

export class WalletController {
    private readonly walletService: IWalletService

    constructor(walletService: IWalletService) {
        this.walletService = walletService
    }

    getWallet = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return this.walletService.getWallet(userId)
    })

    purchase = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { amount } = await parseJson(req, purchaseSchema)

        return this.walletService.purchaseCoins(userId, amount)
    })

    spend = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { amount, feature } = await parseJson(req, spendSchema)

        return this.walletService.spendOnFeature(userId, amount, feature)
    })
}

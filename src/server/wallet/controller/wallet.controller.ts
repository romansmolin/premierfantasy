import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { withController } from '@/shared/lib/http'

import type { IWalletService } from '../service/wallet.service.interface'

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
}

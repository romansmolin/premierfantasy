import type { IWalletData } from '@/entities/wallet/model/wallet.types'

import { Errors } from '@/shared/lib/http'

import type { IWalletService } from './wallet.service.interface'
import type { IWalletRepository } from '../repository/wallet.repository.interface'

export class WalletService implements IWalletService {
    private readonly walletRepository

    constructor(walletRepository: IWalletRepository) {
        this.walletRepository = walletRepository
    }

    async getWallet(userId: string): Promise<IWalletData> {
        const [balance, transactions] = await Promise.all([
            this.walletRepository.getUserBalance(userId),
            this.walletRepository.getTransactionHistory(userId),
        ])

        return { balance, transactions }
    }

    getBalance(userId: string): Promise<number> {
        return this.walletRepository.getUserBalance(userId)
    }

    async spendOnFeature(userId: string, amount: number, featureName: string): Promise<void> {
        if (amount <= 0) throw Errors.badRequest('Amount must be positive')

        const spent = await this.walletRepository.spendIfSufficient(
            userId,
            amount,
            `Spent ${amount} credits on ${featureName}`,
        )

        if (!spent) throw Errors.paymentRequired()
    }
}

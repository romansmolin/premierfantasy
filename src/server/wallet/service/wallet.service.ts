import type { IWalletData } from '@/entities/wallet/model/wallet.types'

import type { IWalletService } from './wallet.service.interface'
import type { IWalletRepository } from '../repository/wallet.repository.interface'

const REWARD_MAP: Record<number, number> = { 1: 500, 2: 300, 3: 100 }

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

    async purchaseCoins(userId: string, amount: number): Promise<IWalletData> {
        if (amount <= 0) throw new Error('Amount must be positive')

        await this.walletRepository.createTransaction({
            userId,
            amount,
            type: 'PURCHASE',
            description: `Purchased ${amount} coins`,
        })

        return this.getWallet(userId)
    }

    async spendOnFeature(userId: string, amount: number, featureName: string): Promise<IWalletData> {
        if (amount <= 0) throw new Error('Amount must be positive')

        const balance = await this.walletRepository.getUserBalance(userId)

        if (balance < amount) throw new Error('Insufficient coin balance')

        await this.walletRepository.createTransaction({
            userId,
            amount: -amount,
            type: 'AI_FEATURE_SPEND',
            description: `Spent ${amount} coins on ${featureName}`,
        })

        return this.getWallet(userId)
    }

    async awardCompetitionReward(userId: string, competitionId: string, rank: number): Promise<void> {
        const reward = REWARD_MAP[rank]

        if (!reward) return

        const ordinal = rank === 1 ? 'st' : rank === 2 ? 'nd' : 'rd'

        await this.walletRepository.createTransaction({
            userId,
            amount: reward,
            type: 'COMPETITION_REWARD',
            description: `${rank}${ordinal} place reward`,
        })
    }
}

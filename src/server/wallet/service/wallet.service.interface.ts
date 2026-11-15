import type { IWalletData } from '@/entities/wallet/model/wallet.types'

export interface IWalletService {
    getWallet(userId: string): Promise<IWalletData>
    getBalance(userId: string): Promise<number>
    spendOnFeature(userId: string, amount: number, featureName: string): Promise<void>
    awardCompetitionReward(userId: string, competitionId: string, rank: number): Promise<void>
}

import type { IWalletData } from '@/entities/wallet/model/wallet.types'

export interface IWalletService {
    getWallet(userId: string): Promise<IWalletData>
    spendOnFeature(userId: string, amount: number, featureName: string): Promise<IWalletData>
    awardCompetitionReward(userId: string, competitionId: string, rank: number): Promise<void>
}

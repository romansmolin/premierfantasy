export type TransactionType = 'COMPETITION_REWARD' | 'PURCHASE' | 'AI_FEATURE_SPEND'

export interface ICoinTransaction {
    id: string
    userId: string
    amount: number
    type: TransactionType
    description: string
    createdAt: Date
}

export interface IWalletData {
    balance: number
    transactions: ICoinTransaction[]
}

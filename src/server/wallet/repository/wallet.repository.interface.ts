import type { ICoinTransaction, TransactionType } from '@/entities/wallet/model/wallet.types'

export interface CreateTransactionData {
    userId: string
    amount: number
    type: TransactionType
    description: string
}

export interface IWalletRepository {
    getUserBalance(userId: string): Promise<number>
    createTransaction(data: CreateTransactionData): Promise<ICoinTransaction>
    getTransactionHistory(userId: string, limit?: number): Promise<ICoinTransaction[]>
}

import type { ICoinTransaction, TransactionType } from '@/entities/wallet/model/wallet.types'

export interface CreateTransactionData {
    userId: string
    amount: number
    type: TransactionType
    description: string
    paymentTokenId?: string | null
}

export interface IWalletRepository {
    getUserBalance(userId: string): Promise<number>
    createTransaction(data: CreateTransactionData): Promise<ICoinTransaction>
    getTransactionHistory(userId: string, limit?: number): Promise<ICoinTransaction[]>
    /** Atomically deducts `amount` only if the balance covers it. Returns false when it does not. */
    spendIfSufficient(userId: string, amount: number, description: string): Promise<boolean>
}

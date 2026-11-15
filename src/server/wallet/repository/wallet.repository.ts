import type { ICoinTransaction } from '@/entities/wallet/model/wallet.types'

import { prisma } from '@/shared/lib/prisma'

import type { CreateTransactionData, IWalletRepository } from './wallet.repository.interface'

export class WalletRepository implements IWalletRepository {
    async getUserBalance(userId: string): Promise<number> {
        const user = await prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { coinBalance: true },
        })

        return user.coinBalance
    }

    async createTransaction(data: CreateTransactionData): Promise<ICoinTransaction> {
        const [transaction] = await prisma.$transaction([
            prisma.coinTransaction.create({ data }),
            prisma.user.update({
                where: { id: data.userId },
                data: { coinBalance: { increment: data.amount } },
            }),
        ])

        return transaction as ICoinTransaction
    }

    async spendIfSufficient(userId: string, amount: number, description: string): Promise<boolean> {
        return prisma.$transaction(async (tx) => {
            const { count } = await tx.user.updateMany({
                where: { id: userId, coinBalance: { gte: amount } },
                data: { coinBalance: { decrement: amount } },
            })

            if (count === 0) return false

            await tx.coinTransaction.create({
                data: { userId, amount: -amount, type: 'AI_FEATURE_SPEND', description },
            })

            return true
        })
    }

    async getTransactionHistory(userId: string, limit = 50): Promise<ICoinTransaction[]> {
        const transactions = await prisma.coinTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        })

        return transactions as ICoinTransaction[]
    }
}

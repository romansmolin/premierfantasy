import { prisma } from '@/shared/lib/prisma'

import type {
    CreatePaymentData,
    IPaymentRepository,
    PaymentTokenRecord,
} from './payment.repository.interface'

export class PaymentRepository implements IPaymentRepository {
    async create(data: CreatePaymentData): Promise<PaymentTokenRecord> {
        return prisma.paymentToken.create({ data }) as Promise<PaymentTokenRecord>
    }

    async findByToken(token: string): Promise<PaymentTokenRecord | null> {
        return prisma.paymentToken.findUnique({ where: { token } }) as Promise<PaymentTokenRecord | null>
    }

    async findById(id: string): Promise<PaymentTokenRecord | null> {
        return prisma.paymentToken.findUnique({ where: { id } }) as Promise<PaymentTokenRecord | null>
    }

    async updateStatus(id: string, status: string, gatewayUid?: string): Promise<PaymentTokenRecord> {
        return prisma.paymentToken.update({
            where: { id },
            data: { status: status as never, gatewayUid },
        }) as Promise<PaymentTokenRecord>
    }

    async findByUserId(userId: string): Promise<PaymentTokenRecord[]> {
        return prisma.paymentToken.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        }) as Promise<PaymentTokenRecord[]>
    }
}

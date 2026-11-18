import { prisma } from '@/shared/lib/prisma'
import type { CheckoutCustomer } from '@/shared/model/checkout-customer'

import type { IBillingRepository } from './billing.repository.interface'

const select = {
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    address: true,
    city: true,
    country: true,
    zip: true,
    birthDate: true,
} as const

export class BillingRepository implements IBillingRepository {
    async findByUserId(userId: string): Promise<CheckoutCustomer | null> {
        const row = await prisma.billingProfile.findUnique({ where: { userId }, select })

        return row && { ...row, birthDate: row.birthDate ?? '' }
    }

    async upsert(userId: string, customer: CheckoutCustomer): Promise<CheckoutCustomer> {
        const data = { ...customer, birthDate: customer.birthDate || null }
        const row = await prisma.billingProfile.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
            select,
        })

        return { ...row, birthDate: row.birthDate ?? '' }
    }
}

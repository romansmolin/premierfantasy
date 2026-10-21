import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from 'better-auth/crypto'

import { PrismaClient } from '../generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.STORAGE_DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const EMAIL = process.env.TEST_USER_EMAIL ?? 'test@example.com'
const PASSWORD = process.env.TEST_USER_PASSWORD ?? 'password12345'
const NAME = process.env.TEST_USER_NAME ?? 'Test User'
const CREDITS = Number(process.env.TEST_USER_CREDITS ?? 10000)

async function main() {
    const hashed = await hashPassword(PASSWORD)

    const user = await prisma.user.upsert({
        where: { email: EMAIL },
        create: {
            name: NAME,
            email: EMAIL,
            emailVerified: true,
            coinBalance: CREDITS,
        },
        update: {
            coinBalance: CREDITS,
            emailVerified: true,
        },
    })

    const existing = await prisma.account.findFirst({
        where: { userId: user.id, providerId: 'credential' },
    })

    if (existing) {
        await prisma.account.update({
            where: { id: existing.id },
            data: { password: hashed },
        })
    } else {
        await prisma.account.create({
            data: {
                userId: user.id,
                accountId: user.id,
                providerId: 'credential',
                password: hashed,
            },
        })
    }

    console.warn('Test user ready:')
    console.warn({ id: user.id, email: EMAIL, password: PASSWORD, coinBalance: CREDITS })
}

main()
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())

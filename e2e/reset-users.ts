import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../generated/prisma/client'

/** Removes the e2e users (their squads, reports, transactions and sessions cascade) so every run starts clean. */
const emails = ['e2e@example.com', 'e2e-poor@example.com']
const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.STORAGE_DATABASE_URL }),
})

prisma.user
    .deleteMany({ where: { email: { in: emails } } })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())

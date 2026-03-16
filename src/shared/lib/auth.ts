import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

import { getEnv } from '../utils/get-env'

import { prisma } from './prisma'

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    databaseHooks: {
        user: {
            create: {
                // async after(user) {
                //     await sendWelcomeEmail(user.email, user.name)
                // },
            },
        },
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
    },
    secret: getEnv('BETTER_AUTH_SECRET'),
    baseURL: getEnv('BETTER_AUTH_URL'),
})

export type Session = typeof auth.$Infer.Session

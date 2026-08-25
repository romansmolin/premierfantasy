import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { APIError } from 'better-auth/api'

import { DEMO_EMAIL_DOMAIN } from '@/server/demo/lib/demo-roster'

import { getEnv } from '../utils/get-env'

import { prisma } from './prisma'

const appUrl = getEnv('BETTER_AUTH_URL')

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    databaseHooks: {
        user: {
            create: {
                /**
                 * Demo competitors are seeded straight into the users table and
                 * deliberately have no Account row, so they cannot sign in. This
                 * closes the other direction: nobody can sign up on the reserved
                 * demo domain and inherit a seeded manager's identity.
                 */
                async before(user) {
                    if (user.email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`)) {
                        throw new APIError('BAD_REQUEST', {
                            message: 'This email domain is reserved.',
                        })
                    }

                    return { data: user }
                },
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
    baseURL: appUrl,
    trustedOrigins: [appUrl],
    advanced: {
        cookiePrefix: 'premier-fantasy',
        useSecureCookies: false,
    },
})

export type Session = typeof auth.$Infer.Session

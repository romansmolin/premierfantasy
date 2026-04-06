import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    // Auth check - user can only change their own password
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user?.id || session.user.id !== id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = changePasswordSchema.safeParse(body)

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    try {
        // Get current account
        const account = await prisma.account.findFirst({
            where: { userId: id, providerId: 'credential' },
        })

        if (!account?.password) {
            return NextResponse.json({ error: 'No password set for this account' }, { status: 400 })
        }

        // Verify current password
        const { verifyPassword } = await import('better-auth/crypto')
        const isValid = await verifyPassword({
            hash: account.password,
            password: parsed.data.currentPassword,
        })

        if (!isValid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
        }

        // Hash and set new password
        const { hashPassword } = await import('better-auth/crypto')
        const hashedPassword = await hashPassword(parsed.data.newPassword)

        await prisma.account.update({
            where: { id: account.id },
            data: { password: hashedPassword },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to change password'

        return NextResponse.json({ error: message }, { status: 500 })
    }
}

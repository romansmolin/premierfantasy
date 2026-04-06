import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/shared/lib/prisma'

// Use Better Auth's own password hashing
async function betterAuthHashPassword(password: string): Promise<string> {
    const { hashPassword } = await import('better-auth/crypto')

    return hashPassword(password)
}

export async function POST(req: NextRequest) {
    const { email, newPassword } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const account = await prisma.account.findFirst({
        where: { userId: user.id, providerId: 'credential' },
    })

    if (!account) return NextResponse.json({ error: 'No credential account found' }, { status: 404 })

    const hashedPassword = await betterAuthHashPassword(newPassword)

    await prisma.account.update({
        where: { id: account.id },
        data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true, email })
}

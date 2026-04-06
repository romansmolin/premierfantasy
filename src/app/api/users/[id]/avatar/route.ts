import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

const avatarSchema = z.object({
    image: z.string().url().nullable(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user?.id || session.user.id !== id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = avatarSchema.safeParse(body)

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    try {
        const user = await prisma.user.update({
            where: { id },
            data: { image: parsed.data.image },
        })

        return NextResponse.json({ image: user.image })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update avatar'

        return NextResponse.json({ error: message }, { status: 500 })
    }
}

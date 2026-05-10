import { NextResponse } from 'next/server'

import { auth } from './auth'

import type { NextRequest } from 'next/server'

export async function requireUserId(req: NextRequest): Promise<string | NextResponse> {
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return session.user.id
}

export function isAuthError(value: string | NextResponse): value is NextResponse {
    return value instanceof NextResponse
}

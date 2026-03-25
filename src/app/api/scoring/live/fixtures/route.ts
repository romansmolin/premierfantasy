import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    const gameweekNumber = req.nextUrl.searchParams.get('gameweekNumber')

    if (!gameweekNumber) {
        return NextResponse.json({ error: 'gameweekNumber is required' }, { status: 400 })
    }

    // Live fixtures will be implemented when the scoring service is extended
    return NextResponse.json([])
}

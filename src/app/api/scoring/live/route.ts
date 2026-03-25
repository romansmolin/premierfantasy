import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    const gameweekId = req.nextUrl.searchParams.get('gameweekId')
    const fantasyTeamId = req.nextUrl.searchParams.get('fantasyTeamId')

    if (!gameweekId || !fantasyTeamId) {
        return NextResponse.json({ error: 'gameweekId and fantasyTeamId are required' }, { status: 400 })
    }

    // Live scoring will be implemented when the scoring service is extended
    return NextResponse.json({
        fantasyTeamId,
        gameweekId,
        totalLivePoints: 0,
        players: [],
        fixtures: [],
    })
}

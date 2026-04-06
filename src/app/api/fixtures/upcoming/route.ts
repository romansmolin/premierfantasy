import { NextRequest, NextResponse } from 'next/server'

import { apiFootballClient } from '@/shared/api/api-football-client'
import { LEAGUE_ID, SEASON } from '@/shared/config/league'

interface ApiFixture {
    fixture: { id: number; date: string; status: { short: string } }
    league: { round: string }
    teams: {
        home: { id: number; name: string; logo: string }
        away: { id: number; name: string; logo: string }
    }
    goals: { home: number | null; away: number | null }
}

export async function GET(req: NextRequest) {
    const count = Number(req.nextUrl.searchParams.get('count') ?? '20')

    try {
        const fixtures = await apiFootballClient.get<ApiFixture[]>('/fixtures', {
            league: LEAGUE_ID,
            season: SEASON,
            next: count,
        })

        const mapped = (fixtures ?? []).map((f) => ({
            id: f.fixture.id,
            date: f.fixture.date,
            status: f.fixture.status.short,
            homeTeam: f.teams.home,
            awayTeam: f.teams.away,
            goals: f.goals,
            round: f.league.round,
        }))

        return NextResponse.json(mapped)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch fixtures'

        return NextResponse.json({ error: message }, { status: 500 })
    }
}

import { apiFootballClient } from '@/shared/api/api-football-client'

import type { IApiFixture, IFixtureRepository } from './fixture.repository.interface'

interface ApiFixtureRow {
    fixture: { id: number; date: string; status: { short: string } }
    league: { id: number; round: string }
    teams: {
        home: { id: number; name: string; logo: string }
        away: { id: number; name: string; logo: string }
    }
    goals: { home: number | null; away: number | null }
}

/** Data access for fixtures. The "database" here is API-Football. */
export class FixtureRepository implements IFixtureRepository {
    async findNextByLeague(leagueExternalId: number, season: number, count: number): Promise<IApiFixture[]> {
        const rows = await apiFootballClient.get<ApiFixtureRow[]>('/fixtures', {
            league: leagueExternalId,
            season,
            next: count,
        })

        return (rows ?? []).map((row) => ({
            id: row.fixture.id,
            date: row.fixture.date,
            status: row.fixture.status.short,
            homeTeam: row.teams.home,
            awayTeam: row.teams.away,
            goals: row.goals,
            round: row.league.round,
            leagueExternalId: row.league.id,
        }))
    }
}

export interface IApiFixture {
    id: number
    date: string
    status: string
    homeTeam: { id: number; name: string; logo: string }
    awayTeam: { id: number; name: string; logo: string }
    goals: { home: number | null; away: number | null }
    round: string
    leagueExternalId: number
}

export interface IFixtureRepository {
    /** The next `count` scheduled fixtures for a league season, soonest first. */
    findNextByLeague(leagueExternalId: number, season: number, count: number): Promise<IApiFixture[]>
}

export interface FixtureUpsert {
    externalId: number
    leagueSeasonId: string
    round: string
    roundNumber: number | null
    kickoff: Date
    status: string
    homeTeamId: string
    awayTeamId: string
    homeGoals: number | null
    awayGoals: number | null
}

export interface IMatchDataRepository {
    findLeagueSeason(leagueExternalId: number, year: number): Promise<{ id: string } | null>
    countFixtures(leagueSeasonId: string): Promise<number>
    findTeamIdsByExternalIds(externalIds: number[]): Promise<Map<number, string>>
    /** Upserts on `externalId`. Never touches FPL link or stats bookkeeping columns. */
    upsertFixtures(rows: FixtureUpsert[]): Promise<{ inserted: number; updated: number }>
}

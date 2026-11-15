import type { PlayerPosition } from '@/entities/players/model/player.types'

import type { PlayerMatchStatsRow } from '../lib/match-stats.types'

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

export interface FixtureRef {
    id: string
    externalId: number
}

export interface NewPlayer {
    externalId: number
    name: string
    position: PlayerPosition
    teamId: string
}

/** Fixtures that stop being retried after this many empty answers. */
export const MAX_STATS_ATTEMPTS = 5

export interface IMatchDataRepository {
    findLeagueSeason(leagueExternalId: number, year: number): Promise<{ id: string } | null>
    countFixtures(leagueSeasonId: string): Promise<number>
    findTeamIdsByExternalIds(externalIds: number[]): Promise<Map<number, string>>
    /** Upserts on `externalId`. Never touches FPL link or stats bookkeeping columns. */
    upsertFixtures(rows: FixtureUpsert[]): Promise<{ inserted: number; updated: number }>

    /** Finished fixtures of the season without stats yet and with fewer than MAX_STATS_ATTEMPTS tries, newest first. */
    findFixturesNeedingStats(seasonYear: number, limit: number): Promise<FixtureRef[]>
    findPlayersByExternalIds(
        externalIds: number[],
    ): Promise<Map<number, { id: string; position: PlayerPosition }>>
    /** Creates players and returns externalId → id for all given rows (existing ones included). */
    createPlayers(rows: NewPlayer[]): Promise<Map<number, string>>
    /** One transaction: upsert the rows on (fixtureId, playerId) and set the fixture's statsSyncedAt. */
    saveFixtureStats(fixtureId: string, rows: PlayerMatchStatsRow[]): Promise<void>
    incrementStatsAttempts(fixtureId: string): Promise<void>
}

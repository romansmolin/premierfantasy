import type { OurPlayer, PlayerMatch } from '../lib/player-matcher'
import type { OurTeam } from '../lib/team-matcher'

export interface FplEventRow {
    id: number
    name: string
    deadline: Date
    finished: boolean
    isCurrent: boolean
    isNext: boolean
}

export interface FplGameSettingsRow {
    seasonYear: number
    squadSize: number
    startingSize: number
    budgetTenths: number
    teamLimit: number
    positions: {
        position: 'GK' | 'DEF' | 'MID' | 'FWD'
        squadSelect: number
        minPlay: number
        maxPlay: number
    }[]
}

export interface FplPriceRow {
    playerId: string
    /** Millions, e.g. 6.2 */
    price: number
}

export interface FixtureForLinking {
    id: string
    kickoff: Date
    homeFplTeamId: number | null
    awayFplTeamId: number | null
}

export interface FixtureFplLink {
    fixtureId: string
    fplFixtureId: number
    fplEvent: number | null
}

export interface FplEventPointRow {
    fplPlayerId: number
    totalPoints: number
    minutes: number
}

export interface FplAvailabilityRow {
    fplId: number
    teamId: string | null
    status: string
    chanceOfPlaying: number | null
    news: string
    penaltiesOrder: number | null
}

export interface FplPlayerMatchRow {
    fplPlayerId: number
    fplFixtureId: number
    event: number
    minutes: number
    starts: number
    goals: number
    assists: number
    xg: number | null
    xa: number | null
    totalPoints: number
    wasHome: boolean
}

export interface IFplRepository {
    saveEvents(events: FplEventRow[]): Promise<void>
    saveGameSettings(row: FplGameSettingsRow): Promise<void>
    /** Teams of the league season (Premier League clubs of that year). */
    findLeagueTeams(seasonYear: number): Promise<OurTeam[]>
    /** fplTeamId → our Team.id */
    setTeamFplIds(map: Map<number, string>): Promise<void>
    saveAvailability(rows: FplAvailabilityRow[]): Promise<void>
    findLeaguePlayers(seasonYear: number): Promise<OurPlayer[]>
    loadMappingState(): Promise<{
        mappedFplIds: Set<number>
        mappedPlayerIds: Set<string>
        rejectedFplIds: Set<number>
    }>
    /** Inserts AUTO mappings only for fplId/playerId pairs that do not exist yet; returns how many were new. Never updates. */
    insertAutoMappings(matches: PlayerMatch[]): Promise<number>
    /** fplId → playerId for every mapping (AUTO and MANUAL). */
    findFplPlayerMap(): Promise<Map<number, string>>
    /** Inserts or updates; basePrice is set on insert only; always touches updatedAt. */
    upsertFplPrices(seasonYear: number, rows: FplPriceRow[]): Promise<{ inserted: number; updated: number }>
    deleteNonFplPrices(seasonYear: number): Promise<number>
    findFixturesForLinking(seasonYear: number): Promise<FixtureForLinking[]>
    setFixtureFplLinks(links: FixtureFplLink[]): Promise<void>
    findEvents(): Promise<{ id: number; finished: boolean; isCurrent: boolean }[]>
    findEventsWithPoints(): Promise<Set<number>>
    saveEventPoints(event: number, rows: FplEventPointRow[]): Promise<void>
    /**
     * FPL ids of mapped players whose per-match rows are missing (minutes > 0 in a finished event without a row)
     * or stale (minutes > 0 in the current or previous event, newest row older than 12 hours).
     * Missing first, then by season minutes descending.
     */
    findPlayersNeedingMatches(limit: number, now: Date): Promise<number[]>
    /** Upserts on (fplPlayerId, fplFixtureId). */
    savePlayerMatches(rows: FplPlayerMatchRow[]): Promise<void>
}

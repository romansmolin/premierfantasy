import type { StatsLine } from '../lib/player-form'
import type { Position } from '@/server/prediction/lib/scoring-rules'

export interface ClubRef {
    id: string
    name: string
    logo: string | null
}

export interface StatsPlayer {
    id: string
    externalId: number
    name: string
    position: Position
    club: ClubRef
    /** Millions; only a fresh FPL price (not older than 3 days), else null. */
    price: number | null
    availability: { status: string; chanceOfPlaying: number | null; news: string } | null
}

export interface StatsLineRow extends StatsLine {
    playerId: string
    fixtureId: string
    opponentName: string
    isHome: boolean
}

export interface StatsFixture {
    id: string
    kickoff: Date
    status: string
    /** FPL gameweek of the fixture; null when unscheduled. */
    fplEvent: number | null
    home: ClubRef
    away: ClubRef
}

/** One FPL per-match line of a player; `xg`/`xa` are null when FPL has no value (never 0). */
export interface FormMatch {
    fixtureId: string
    kickoff: Date
    opponentName: string
    isHome: boolean
    minutes: number
    started: boolean
    goals: number
    xg: number | null
    assists: number
    xa: number | null
}

export interface UpcomingFixture extends StatsFixture {
    event: number
}

export interface PredictionView {
    playerId: string
    expectedPoints: number
    expectedMinutes: number
    components: Record<string, number>
}

export interface IStatsRepository {
    /** Players of the current Premier League clubs. */
    findPlayers(): Promise<StatsPlayer[]>
    /** Lines of the current season; one player or all. */
    findLines(playerId?: string): Promise<StatsLineRow[]>
    findNextEventFixtures(): Promise<{ event: number | null; fixtures: StatsFixture[] }>
    findPredictions(event: number): Promise<PredictionView[]>
    /** FPL per-match rows of the player in kickoff order; rows whose fixture is unknown are dropped. */
    findFplMatches(playerId: string): Promise<FormMatch[]>
    /** FPL penalties_order of the player; null when unmapped or unset. */
    findPenaltyOrder(playerId: string): Promise<number | null>
    /** Matches with minutes played over every stored season (what the v2 model counts as appearances). */
    countAppearances(playerId: string): Promise<number>
    findFixturesByIds(ids: string[]): Promise<StatsFixture[]>
    /** Fixtures of the next `events` gameweeks, starting at the next one. */
    findUpcomingFixtures(events: number): Promise<UpcomingFixture[]>
}

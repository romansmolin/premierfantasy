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
    home: ClubRef
    away: ClubRef
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
}

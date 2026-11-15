import type { PlayerPosition } from '@/entities/players/model/player.types'

type Nullable<T> = T | null

/** One player in `GET /fixtures/players?fixture=ID`. Any number may be null; `rating` and `accuracy` may be strings. */
export interface ApiPlayerEntry {
    player: { id: number; name: string }
    statistics: {
        games: {
            minutes: Nullable<number>
            position: Nullable<string>
            rating: Nullable<string>
            substitute: boolean
        }
        shots: { total: Nullable<number>; on: Nullable<number> }
        goals: {
            total: Nullable<number>
            conceded: Nullable<number>
            assists: Nullable<number>
            saves: Nullable<number>
        }
        passes: { total: Nullable<number>; key: Nullable<number>; accuracy: Nullable<string | number> }
        tackles: { total: Nullable<number>; blocks: Nullable<number>; interceptions: Nullable<number> }
        duels: { total: Nullable<number>; won: Nullable<number> }
        dribbles: { attempts: Nullable<number>; success: Nullable<number> }
        fouls: { drawn: Nullable<number>; committed: Nullable<number> }
        cards: { yellow: Nullable<number>; red: Nullable<number> }
        // API-Football spells it "commited".
        penalty: {
            won: Nullable<number>
            commited: Nullable<number>
            scored: Nullable<number>
            missed: Nullable<number>
            saved: Nullable<number>
        }
    }[]
}

export interface ApiFixturePlayers {
    team: { id: number }
    players: ApiPlayerEntry[]
}

/** Columns of `PlayerMatchStats` that come from the API entry (no fixture/player/team ids). */
export interface PlayerMatchStatsInput {
    position: PlayerPosition | null
    isSubstitute: boolean
    minutes: number
    rating: number | null
    goals: number
    assists: number
    shotsTotal: number
    shotsOn: number
    passesTotal: number
    passesKey: number
    passAccuracy: number | null
    tackles: number
    blocks: number
    interceptions: number
    duelsTotal: number
    duelsWon: number
    dribblesAttempts: number
    dribblesSuccess: number
    foulsDrawn: number
    foulsCommitted: number
    yellowCards: number
    redCards: number
    saves: number
    goalsConceded: number
    penaltyWon: number
    penaltyCommitted: number
    penaltyScored: number
    penaltyMissed: number
    penaltySaved: number
}

export interface PlayerMatchStatsRow extends PlayerMatchStatsInput {
    playerId: string
    teamId: string
}

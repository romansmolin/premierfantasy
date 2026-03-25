import type { PlayerPosition } from '@/entities/players'

export interface PlayerStatsRow {
    playerId: string
    gameweekId: string
    minutesPlayed: number
    goals: number
    assists: number
    cleanSheet: boolean
    saves: number
    penaltySaved: number
    penaltyMissed: number
    goalsConceded: number
    yellowCards: number
    redCards: number
    ownGoals: number
    totalPoints: number
}

export interface PlayerLookupRow {
    id: string
    externalId: number
    position: PlayerPosition
}

export interface IPlayerGameweekStatsRepository {
    upsert(data: PlayerStatsRow): Promise<void>
    upsertMany(data: PlayerStatsRow[]): Promise<void>
    findByGameweek(gameweekId: string): Promise<PlayerStatsRow[]>
    findByPlayer(playerId: string): Promise<PlayerStatsRow[]>
    findByPlayerAndGameweek(playerId: string, gameweekId: string): Promise<PlayerStatsRow | null>
    findPlayersByExternalIds(externalIds: number[]): Promise<PlayerLookupRow[]>
    upsertGameweekPoints(fantasyTeamId: string, gameweekId: string, points: number): Promise<void>
}

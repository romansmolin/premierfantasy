import type { SquadPlayerInfo, SquadRules } from '@/entities/squad/model/rules'

export interface StoredSquad {
    id: string
    userId: string
    name: string
    captainPlayerId: string
    viceCaptainPlayerId: string
    updatedAt: Date
    players: {
        playerId: string
        slot: 'START' | 'BENCH'
        position: number
        priceTenthsAtSave: number | null
    }[]
}

export interface SquadWrite {
    name: string
    captainPlayerId: string
    viceCaptainPlayerId: string
    players: {
        playerId: string
        slot: 'START' | 'BENCH'
        position: number
        priceTenthsAtSave: number | null
    }[]
}

export interface ISquadRepository {
    countByUser(userId: string): Promise<number>
    findByUser(userId: string): Promise<StoredSquad[]>
    findOwned(userId: string, id: string): Promise<StoredSquad | null>
    create(userId: string, data: SquadWrite): Promise<StoredSquad>
    /** Replaces the squad's players in one transaction. */
    replace(id: string, data: SquadWrite): Promise<StoredSquad>
    delete(id: string): Promise<void>
    /** Position, current club and fresh FPL price of the given players (unknown ids are simply absent). */
    findPlayerInfos(ids: string[]): Promise<SquadPlayerInfo[]>
    /** Rules from `fpl_game_settings`, or null before the first FPL sync. */
    findRules(): Promise<SquadRules | null>
}

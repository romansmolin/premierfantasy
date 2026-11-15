import type { OurPlayer } from '../lib/player-matcher'

export interface IFplMappingRepository {
    findMappings(): Promise<{ fplId: number; playerId: string; method: string; confidence: number }[]>
    findRejectedFplIds(): Promise<Set<number>>
    findLeaguePlayers(seasonYear: number): Promise<OurPlayer[]>
    /** fplTeamId → our Team.id (as set by the bootstrap sync) */
    findFplTeamMap(): Promise<Map<number, string>>
    playerExists(playerId: string): Promise<boolean>
    createManualMapping(fplId: number, playerId: string): Promise<void>
    deleteMapping(fplId: number): Promise<void>
    createRejection(fplId: number): Promise<void>
    deleteRejection(fplId: number): Promise<void>
}

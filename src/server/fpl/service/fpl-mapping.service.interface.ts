export interface UnmappedFplPlayer {
    fplId: number
    name: string
    team: string
    position: 'GK' | 'DEF' | 'MID' | 'FWD'
    nowCost: number
    minutes: number
    candidates: { playerId: string; name: string; score: number }[]
}

export interface AutoMappingReview {
    fplId: number
    fplName: string
    team: string
    playerId: string
    playerName: string
    confidence: number
    /** Free players of the same club the mapping could be replaced with. */
    candidates: { playerId: string; name: string; score: number }[]
}

export interface FplMappingList {
    unmapped: UnmappedFplPlayer[]
    /** AUTO mappings below full confidence, for a human to confirm or replace. */
    review: AutoMappingReview[]
    counts: { mapped: number; ambiguous: number; unmatched: number; rejected: number; autoToReview: number }
}

export interface IFplMappingService {
    /** FPL players with at least 90 minutes that have no mapping and were not rejected. */
    listUnmapped(seasonYear: number): Promise<FplMappingList>
    confirm(fplId: number, playerId: string): Promise<void>
    reject(fplId: number): Promise<void>
    /** Moves an existing mapping to another free player (409 when that player is mapped elsewhere). */
    replace(fplId: number, playerId: string): Promise<void>
    /** Removes a mapping and rejects the fplId (404 when it has no mapping). */
    unmap(fplId: number): Promise<void>
}

export interface UnmappedFplPlayer {
    fplId: number
    name: string
    team: string
    position: 'GK' | 'DEF' | 'MID' | 'FWD'
    nowCost: number
    minutes: number
    candidates: { playerId: string; name: string; score: number }[]
}

export interface FplMappingList {
    unmapped: UnmappedFplPlayer[]
    counts: { mapped: number; ambiguous: number; unmatched: number; rejected: number }
}

export interface IFplMappingService {
    /** FPL players with at least 90 minutes that have no mapping and were not rejected. */
    listUnmapped(seasonYear: number): Promise<FplMappingList>
    confirm(fplId: number, playerId: string): Promise<void>
    reject(fplId: number): Promise<void>
}

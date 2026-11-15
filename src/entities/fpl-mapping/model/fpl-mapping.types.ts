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

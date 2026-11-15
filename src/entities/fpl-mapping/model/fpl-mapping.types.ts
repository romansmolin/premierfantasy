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
    candidates: { playerId: string; name: string; score: number }[]
}

export interface FplMappingList {
    unmapped: UnmappedFplPlayer[]
    review: AutoMappingReview[]
    counts: { mapped: number; ambiguous: number; unmatched: number; rejected: number; autoToReview: number }
}

export interface AutoBuildRequest {
    /** Players that must stay in the squad. */
    lockedIds: string[]
    /** Players that must not be picked. */
    excludedIds: string[]
    /** Pay again and recompute with the current forecast. */
    refresh?: boolean
}

export interface AutoBuildResult {
    event: number
    starters: string[]
    bench: string[]
    captainId: string
    viceCaptainId: string
    totalTenths: number
    /** Expected points of the starting XI with the captain counted twice. */
    expectedXi: number
    /** AI explanation of the choices; null when it could not be generated. */
    explanation: string | null
    generatedAt: string
    /** The forecast has been recalculated since this result was made; a paid refresh would use the new one. */
    forecastUpdated: boolean
}

export interface SquadReview {
    summary: string
    strengths: string[]
    risks: string[]
    suggestions: { out: string; in: string; reason: string }[]
    event: number
    generatedAt: string
    forecastUpdated: boolean
}

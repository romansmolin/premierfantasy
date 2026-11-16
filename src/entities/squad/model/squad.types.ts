import type { Position, SquadRules, SquadValidation } from './rules'

export interface SquadInput {
    name: string
    starters: string[]
    bench: string[]
    captainId: string
    viceCaptainId: string
}

export interface SavedSquad {
    id: string
    name: string
    starters: string[]
    bench: string[]
    captainId: string
    viceCaptainId: string
    updatedAt: string
    validation: SquadValidation
    /** Current total minus the total when saved, in tenths; null when a price is unknown. Positive = the squad got more expensive. */
    priceDriftTenths: number | null
}

export interface PoolPlayer {
    id: string
    name: string
    /** Head shot URL. */
    photoUrl: string
    clubId: string
    clubName: string
    /** Club crest URL; null when unknown. */
    clubLogo: string | null
    position: Position
    priceTenths: number | null
    minutes: number
    form: number | null
    /** Expected FPL points next gameweek; null when the forecast is off or the player has no fixture. */
    forecast: number | null
    availability: { status: string; chanceOfPlaying: number | null; news: string } | null
}

export interface BuilderPool {
    rules: SquadRules
    forecastEnabled: boolean
    nextEvent: number | null
    players: PoolPlayer[]
}

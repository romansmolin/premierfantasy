export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD'

export interface SelectedPlayer {
    id: number
    name: string
    position: PlayerPosition
    teamId: number
    price: number
    photo: string
}

export interface ValidationResult {
    valid: boolean
    reason?: string
}

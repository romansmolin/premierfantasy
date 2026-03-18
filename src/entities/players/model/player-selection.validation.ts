import type { PlayerPosition, SelectedPlayer, ValidationResult } from './player.types'

export const MAX_SQUAD_SIZE = 11
export const MAX_PER_CLUB = 3
export const BUDGET_TOTAL = 100

export const POSITION_LIMITS: Record<PlayerPosition, { min: number; max: number }> = {
    GK: { min: 1, max: 1 },
    DEF: { min: 3, max: 5 },
    MID: { min: 3, max: 5 },
    FWD: { min: 1, max: 3 },
}

export function validateAddPlayer(
    current: SelectedPlayer[],
    candidate: SelectedPlayer,
    budgetLeft: number,
): ValidationResult {
    if (current.length >= MAX_SQUAD_SIZE) {
        return { valid: false, reason: 'Squad is full (11 players maximum)' }
    }

    if (candidate.price > budgetLeft) {
        return { valid: false, reason: `Not enough budget (${budgetLeft.toFixed(1)}m remaining)` }
    }

    const clubCount = current.filter((p) => p.teamId === candidate.teamId).length

    if (clubCount >= MAX_PER_CLUB) {
        return { valid: false, reason: `Maximum ${MAX_PER_CLUB} players from the same club` }
    }

    const positionCount = current.filter((p) => p.position === candidate.position).length
    const limit = POSITION_LIMITS[candidate.position]

    if (positionCount >= limit.max) {
        return { valid: false, reason: `Maximum ${limit.max} ${candidate.position} player(s) allowed` }
    }

    return { valid: true }
}

export function validateSquadComplete(players: SelectedPlayer[]): ValidationResult {
    if (players.length !== MAX_SQUAD_SIZE) {
        return {
            valid: false,
            reason: `Squad must have exactly ${MAX_SQUAD_SIZE} players (currently ${players.length})`,
        }
    }

    for (const [position, { min }] of Object.entries(POSITION_LIMITS)) {
        const count = players.filter((p) => p.position === position).length

        if (count < min) {
            return { valid: false, reason: `Need at least ${min} ${position} player(s) (currently ${count})` }
        }
    }

    return { valid: true }
}

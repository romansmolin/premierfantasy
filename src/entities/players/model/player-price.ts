import type { PlayerPosition } from './player.types'

const PRICE_RANGES: Record<PlayerPosition, { min: number; max: number }> = {
    GK: { min: 4, max: 6 },
    DEF: { min: 4, max: 7 },
    MID: { min: 5, max: 9 },
    FWD: { min: 6, max: 10 },
}

export function generatePlayerPrice(playerId: number, position: PlayerPosition): number {
    const { min, max } = PRICE_RANGES[position]
    const range = max - min

    const seed = ((playerId * 2654435761) >>> 0) / 4294967296

    const raw = min + seed * range

    return Math.round(raw * 10) / 10
}

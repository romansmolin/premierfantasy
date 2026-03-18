import type { PlayerPosition } from './player.types'

const POSITION_MAP: Record<string, PlayerPosition> = {
    Goalkeeper: 'GK',
    Defender: 'DEF',
    Midfielder: 'MID',
    Attacker: 'FWD',
}

export function mapApiPosition(apiPosition: string): PlayerPosition {
    const mapped = POSITION_MAP[apiPosition]

    if (!mapped) {
        throw new Error(`Unknown API position: ${apiPosition}`)
    }

    return mapped
}

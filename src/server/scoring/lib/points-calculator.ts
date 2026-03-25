import type { PlayerPosition } from '@/entities/players'

export interface RawPlayerStats {
    position: PlayerPosition
    minutesPlayed: number
    goals: number
    assists: number
    cleanSheet: boolean
    saves: number
    penaltySaved: number
    penaltyMissed: number
    goalsConceded: number
    yellowCards: number
    redCards: number
    ownGoals: number
}

export function calculatePoints(stats: RawPlayerStats): number {
    let points = 0

    // Appearance
    if (stats.minutesPlayed >= 60) points += 2
    else if (stats.minutesPlayed > 0) points += 1

    // Goals
    const goalPoints: Record<PlayerPosition, number> = { GK: 6, DEF: 6, MID: 5, FWD: 4 }

    points += stats.goals * goalPoints[stats.position]

    // Assists
    points += stats.assists * 3

    // Clean sheet (only if played 60+ minutes)
    if (stats.cleanSheet && stats.minutesPlayed >= 60) {
        const csPoints: Record<PlayerPosition, number> = { GK: 4, DEF: 4, MID: 1, FWD: 0 }

        points += csPoints[stats.position]
    }

    // Saves (GK only, 1 point per 3 saves)
    if (stats.position === 'GK') {
        points += Math.floor(stats.saves / 3)
    }

    // Penalty saved
    points += stats.penaltySaved * 5

    // Penalty missed
    points += stats.penaltyMissed * -2

    // Goals conceded (GK/DEF only, -1 per 2 goals conceded)
    if (stats.position === 'GK' || stats.position === 'DEF') {
        points += Math.floor(stats.goalsConceded / 2) * -1
    }

    // Cards
    points += stats.yellowCards * -1
    points += stats.redCards * -3

    // Own goals
    points += stats.ownGoals * -2

    return points
}

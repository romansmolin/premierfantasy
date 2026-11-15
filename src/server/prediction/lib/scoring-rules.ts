export type Position = 'GK' | 'DEF' | 'MID' | 'FWD'

/**
 * FPL points rules (season 2026/27), checked against FPL live `explain` data. Bonus points are not included.
 * Defensive contribution: FPL counts clearances, blocks, interceptions and tackles (plus recoveries for MID/FWD).
 */
export const FPL_RULES = {
    appearanceShort: 1,
    appearanceFull: 2,
    fullMinutes: 60,
    goal: { GK: 6, DEF: 6, MID: 5, FWD: 4 } as Record<Position, number>,
    assist: 3,
    cleanSheet: { GK: 4, DEF: 4, MID: 1, FWD: 0 } as Record<Position, number>,
    goalsConcededPerPoint: 2,
    savesPerPoint: 3,
    penaltySave: 5,
    penaltyMiss: -2,
    ownGoal: -2,
    yellowCard: -1,
    redCard: -3,
    dcPoints: 2,
    dcThreshold: { GK: null, DEF: 10, MID: 12, FWD: 12 } as Record<Position, number | null>,
}

export interface PointsInput {
    position: Position
    minutes: number
    goals: number
    assists: number
    cleanSheet: boolean
    goalsConceded: number
    saves: number
    penaltiesSaved: number
    penaltiesMissed: number
    ownGoals: number
    yellowCards: number
    redCards: number
    defensiveActions: number
}

/** Points of one player in one match by FPL rules, without bonus. */
export function pointsFromStats(input: PointsInput): number {
    const r = FPL_RULES
    const { position, minutes } = input

    if (minutes <= 0) return 0

    let points = minutes >= r.fullMinutes ? r.appearanceFull : r.appearanceShort

    points += input.goals * r.goal[position] + input.assists * r.assist
    points += input.penaltiesSaved * r.penaltySave + input.penaltiesMissed * r.penaltyMiss
    points += input.ownGoals * r.ownGoal + input.yellowCards * r.yellowCard + input.redCards * r.redCard

    if (input.cleanSheet && minutes >= r.fullMinutes) points += r.cleanSheet[position]

    if (position === 'GK' || position === 'DEF') {
        points -= Math.floor(input.goalsConceded / r.goalsConcededPerPoint)
    }

    if (position === 'GK') points += Math.floor(input.saves / r.savesPerPoint)

    const threshold = r.dcThreshold[position]

    if (threshold !== null && input.defensiveActions >= threshold) points += r.dcPoints

    return points
}

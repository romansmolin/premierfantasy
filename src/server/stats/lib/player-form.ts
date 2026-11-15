import { mean } from '@/server/prediction/lib/math'
import { pointsFromStats } from '@/server/prediction/lib/scoring-rules'

import type { Position } from '@/server/prediction/lib/scoring-rules'

export interface StatsLine {
    kickoff: Date
    minutes: number
    goals: number
    assists: number
    saves: number
    yellowCards: number
    redCards: number
    penaltySaved: number
    penaltyMissed: number
    tackles: number
    blocks: number
    interceptions: number
    shotsTotal: number
    passesKey: number
    /** Goals the player's team conceded in that match. */
    teamGoalsAgainst: number
}

const FORM_APPEARANCES = 5

/** FPL points of one match by FPL rules, without bonus and own goals (not stored). */
export function linePoints(position: Position, l: StatsLine): number {
    return pointsFromStats({
        position,
        minutes: l.minutes,
        goals: l.goals,
        assists: l.assists,
        cleanSheet: l.teamGoalsAgainst === 0,
        goalsConceded: l.teamGoalsAgainst,
        saves: l.saves,
        penaltiesSaved: l.penaltySaved,
        penaltiesMissed: l.penaltyMissed,
        ownGoals: 0,
        yellowCards: l.yellowCards,
        redCards: l.redCards,
        defensiveActions: l.tackles + l.blocks + l.interceptions,
    })
}

/** Mean calculated points of the last 5 appearances (newest first); null without any. */
export function formOf(position: Position, lines: StatsLine[]): number | null {
    const recent = lines
        .filter((l) => l.minutes > 0)
        .sort((a, b) => b.kickoff.getTime() - a.kickoff.getTime())
        .slice(0, FORM_APPEARANCES)

    return recent.length === 0 ? null : mean(recent.map((l) => linePoints(position, l)))
}

export function seasonTotals(lines: StatsLine[]) {
    const played = lines.filter((l) => l.minutes > 0)
    const sum = (pick: (l: StatsLine) => number) => played.reduce((total, l) => total + pick(l), 0)

    return {
        appearances: played.length,
        minutes: sum((l) => l.minutes),
        goals: sum((l) => l.goals),
        assists: sum((l) => l.assists),
        shots: sum((l) => l.shotsTotal),
        keyPasses: sum((l) => l.passesKey),
        tackles: sum((l) => l.tackles),
        yellowCards: sum((l) => l.yellowCards),
        redCards: sum((l) => l.redCards),
    }
}

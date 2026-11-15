import type { PlayerPosition } from '@/entities/players/model/player.types'

import type { ApiPlayerEntry, PlayerMatchStatsInput } from './match-stats.types'

const POSITIONS: Record<string, PlayerPosition> = { G: 'GK', D: 'DEF', M: 'MID', F: 'FWD' }

export function mapMatchPosition(code: string | null): PlayerPosition | null {
    return (code && POSITIONS[code]) || null
}

const num = (value: number | null | undefined): number => value ?? 0

const toNumberOrNull = (value: string | number | null | undefined): number | null => {
    if (value === null || value === undefined || value === '') return null

    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
}

/** Pure mapping of one API player entry to our columns. The entry must have at least one statistics block. */
export function mapPlayerMatchStats(entry: ApiPlayerEntry): PlayerMatchStatsInput {
    const s = entry.statistics[0]

    return {
        position: mapMatchPosition(s.games.position),
        isSubstitute: s.games.substitute,
        minutes: num(s.games.minutes),
        rating: toNumberOrNull(s.games.rating),
        goals: num(s.goals.total),
        assists: num(s.goals.assists),
        shotsTotal: num(s.shots.total),
        shotsOn: num(s.shots.on),
        passesTotal: num(s.passes.total),
        passesKey: num(s.passes.key),
        passAccuracy: toNumberOrNull(s.passes.accuracy),
        tackles: num(s.tackles.total),
        blocks: num(s.tackles.blocks),
        interceptions: num(s.tackles.interceptions),
        duelsTotal: num(s.duels.total),
        duelsWon: num(s.duels.won),
        dribblesAttempts: num(s.dribbles.attempts),
        dribblesSuccess: num(s.dribbles.success),
        foulsDrawn: num(s.fouls.drawn),
        foulsCommitted: num(s.fouls.committed),
        yellowCards: num(s.cards.yellow),
        redCards: num(s.cards.red),
        saves: num(s.goals.saves),
        goalsConceded: num(s.goals.conceded),
        penaltyWon: num(s.penalty.won),
        penaltyCommitted: num(s.penalty.commited),
        penaltyScored: num(s.penalty.scored),
        penaltyMissed: num(s.penalty.missed),
        penaltySaved: num(s.penalty.saved),
    }
}

import { MIN_RADAR_MINUTES, MIN_RADAR_PEERS } from './params'

import type { Position } from '@/server/prediction/lib/scoring-rules'

export type AxisKey =
    | 'goals'
    | 'xg'
    | 'assists'
    | 'xa'
    | 'shotsOn'
    | 'keyPasses'
    | 'defActions'
    | 'duelWinRate'
    | 'cleanSheetRate'
    | 'goalInvolvements'
    | 'saves'
    | 'goalsConceded'
    | 'penaltySaved'

/** One match of one player in the current season. */
export interface SeasonLine {
    playerId: string
    minutes: number
    goals: number
    assists: number
    shotsOn: number
    passesKey: number
    /** Tackles + blocks + interceptions. */
    defActions: number
    duelsTotal: number
    duelsWon: number
    saves: number
    goalsConceded: number
    penaltySaved: number
    cleanSheet: boolean
}

export interface SeasonMetrics {
    minutes: number
    appearances: number
    /** Per 90 minutes, except the two rates (`duelWinRate`, `cleanSheetRate`) which are shares 0–1. Null: no data. */
    per90: Record<AxisKey, number | null>
}

interface AxisSpec {
    key: AxisKey
    label: string
    lowerIsBetter?: boolean
}

const ATTACK: AxisSpec[] = [
    { key: 'goals', label: 'Goals per 90' },
    { key: 'xg', label: 'xG per 90' },
    { key: 'assists', label: 'Assists per 90' },
    { key: 'xa', label: 'xA per 90' },
    { key: 'shotsOn', label: 'Shots on target per 90' },
    { key: 'keyPasses', label: 'Key passes per 90' },
]

export const RADAR_AXES: Record<Position, AxisSpec[]> = {
    FWD: ATTACK,
    MID: ATTACK,
    DEF: [
        { key: 'defActions', label: 'Defensive actions per 90' },
        { key: 'duelWinRate', label: 'Duels won' },
        { key: 'cleanSheetRate', label: 'Clean sheets' },
        { key: 'keyPasses', label: 'Key passes per 90' },
        { key: 'goalInvolvements', label: 'Goals + assists per 90' },
    ],
    GK: [
        { key: 'saves', label: 'Saves per 90' },
        { key: 'goalsConceded', label: 'Goals conceded per 90', lowerIsBetter: true },
        { key: 'cleanSheetRate', label: 'Clean sheets' },
        { key: 'penaltySaved', label: 'Penalties saved per 90' },
    ],
}

/** `fpl` holds the season xG and xA from FPL; null when the player is not mapped. */
export function seasonMetrics(
    lines: SeasonLine[],
    fpl: { xg: number | null; xa: number | null } | null,
): SeasonMetrics {
    const sum = (pick: (l: SeasonLine) => number) => lines.reduce((total, l) => total + pick(l), 0)
    const minutes = sum((l) => l.minutes)
    const per90 = (total: number | null): number | null =>
        total === null || minutes <= 0 ? null : (total * 90) / minutes
    const duels = sum((l) => l.duelsTotal)
    const full = lines.filter((l) => l.minutes >= 60)

    return {
        minutes,
        appearances: lines.filter((l) => l.minutes > 0).length,
        per90: {
            goals: per90(sum((l) => l.goals)),
            xg: per90(fpl?.xg ?? null),
            assists: per90(sum((l) => l.assists)),
            xa: per90(fpl?.xa ?? null),
            shotsOn: per90(sum((l) => l.shotsOn)),
            keyPasses: per90(sum((l) => l.passesKey)),
            defActions: per90(sum((l) => l.defActions)),
            duelWinRate: duels > 0 ? sum((l) => l.duelsWon) / duels : null,
            cleanSheetRate: full.length > 0 ? full.filter((l) => l.cleanSheet).length / full.length : null,
            goalInvolvements: per90(sum((l) => l.goals + l.assists)),
            saves: per90(sum((l) => l.saves)),
            goalsConceded: per90(sum((l) => l.goalsConceded)),
            penaltySaved: per90(sum((l) => l.penaltySaved)),
        },
    }
}

export interface RadarProfile {
    /** True when no radar can be drawn; `reason` says why. */
    lowData: boolean
    reason: string | null
    axes: { key: AxisKey; label: string; value: number | null; percentile: number | null }[]
}

interface RadarInput {
    id: string
    position: Position
    metrics: SeasonMetrics
}

/** Share of peers (the player included, ties count half) that the player beats, 0–100. */
function percentile(value: number, peers: number[], lowerIsBetter: boolean): number {
    const beaten = peers.filter((p) => (lowerIsBetter ? p > value : p < value)).length
    const tied = peers.filter((p) => p === value).length

    return Math.round((100 * (beaten + 0.5 * tied)) / peers.length)
}

export function radarProfiles(players: RadarInput[]): Map<string, RadarProfile> {
    const eligible = players.filter((p) => p.metrics.minutes >= MIN_RADAR_MINUTES)
    const result = new Map<string, RadarProfile>()

    for (const p of players) {
        const peers = eligible.filter((e) => e.position === p.position)
        const reason =
            p.metrics.minutes < MIN_RADAR_MINUTES
                ? `Fewer than ${MIN_RADAR_MINUTES} minutes this season, too little to rank.`
                : peers.length < MIN_RADAR_PEERS
                  ? `Not enough peers: fewer than ${MIN_RADAR_PEERS} players of this position have ${MIN_RADAR_MINUTES}+ minutes.`
                  : null

        result.set(p.id, {
            lowData: reason !== null,
            reason,
            axes: RADAR_AXES[p.position].map(({ key, label, lowerIsBetter }) => {
                const value = p.metrics.per90[key]
                const values = peers.flatMap((e) => {
                    const v = e.metrics.per90[key]

                    return v === null ? [] : [v]
                })
                const ranked = reason === null && value !== null && values.length >= MIN_RADAR_PEERS

                return {
                    key,
                    label,
                    value,
                    percentile: ranked ? percentile(value, values, lowerIsBetter ?? false) : null,
                }
            }),
        })
    }

    return result
}

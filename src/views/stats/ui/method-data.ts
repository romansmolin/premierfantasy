import type { GateResult, Horizon, Metric } from '@/server/prediction/lib/v2/evaluation'

export type GateRow = Pick<
    GateResult,
    'horizon' | 'position' | 'n' | 'brier' | 'baselineBrier' | 'passed' | 'reasons'
>

export const METRIC_ORDER: Metric[] = ['goal', 'assist', 'start', 'points', 'outcome']

const HORIZON_ORDER: Horizon[] = ['next', 'later']
const POSITION_ORDER: GateResult['position'][] = ['GK', 'DEF', 'MID', 'FWD', 'ALL']

const rank = <T>(order: T[], value: T) => order.indexOf(value)

export function gateSort(a: GateResult, b: GateResult): number {
    return (
        rank(METRIC_ORDER, a.metric) - rank(METRIC_ORDER, b.metric) ||
        rank(HORIZON_ORDER, a.horizon) - rank(HORIZON_ORDER, b.horizon) ||
        rank(POSITION_ORDER, a.position) - rank(POSITION_ORDER, b.position)
    )
}

export function groupGates(gates: GateResult[]): { metric: Metric; rows: GateRow[] }[] {
    const groups: { metric: Metric; rows: GateRow[] }[] = []

    for (const g of [...gates].sort(gateSort)) {
        const row: GateRow = {
            horizon: g.horizon,
            position: g.position,
            n: g.n,
            brier: g.brier,
            baselineBrier: g.baselineBrier,
            passed: g.passed,
            reasons: g.reasons,
        }
        const last = groups[groups.length - 1]

        if (last?.metric === g.metric) last.rows.push(row)
        else groups.push({ metric: g.metric, rows: [row] })
    }

    return groups
}

// Observed shares are facts, so they are rounded plainly (formatChance would turn a true 100% into ">99%").
const percent = (p: number) => `${Math.round(p * 100)}%`

export function calibrationRows(
    buckets: GateResult['buckets'],
): { range: string; predicted: string; observed: string; n: number }[] {
    return buckets.map((b) => ({
        range: `${Math.round(b.lo * 100)}–${percent(b.hi)}`,
        predicted: percent(b.predicted),
        observed: percent(b.observed),
        n: b.n,
    }))
}

/** Model constants the page documents; the app layer reads them from the model and passes them down. */
export interface MethodParams {
    decay: number
    minutesDecay: number
    priorMinutes90: number
    xgWeight: number
    sims: number
    horizonMatches: number
    minAppearances: number
    /** Scope of the accuracy check: expected minutes and earlier matches a player needs to be a record. */
    minExpectedMinutes: number
    minHistoryMatches: number
    gate: {
        minEvents: number
        minRecords: number
        minBucketN: number
        maxBucketGap: number
        minBrierEdge: number
    }
}

import { buildInputsForEvent } from './inputs'
import { clamp, fitLinear, mae, mean, spearman } from './math'
import { DEFAULT_PARAMS, MODEL_VERSION, predictPlayer } from './model'

import type { ForecastDataset } from './inputs'
import type { ModelParams } from './model'
import type { Position } from './scoring-rules'

export interface Calibration {
    intercept: number
    slope: number
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD']
const IDENTITY: Calibration = { intercept: 0, slope: 1 }
const MIN_CALIBRATION_ROWS = 200
const MIN_EXPECTED_MINUTES = 30
const MIN_GROUP_SIZE = 10
const BASELINE_APPEARANCES = 5

export const BAR = { minEvents: 8, minPlayerEvents: 500 }

export interface Evaluation {
    modelVersion: string
    eventsEvaluated: number
    playerEvents: number
    mae: number
    baselineMae: number
    rankCorr: number
    baselineRankCorr: number
    passed: boolean
    reasons: string[]
    details: Record<string, unknown>
}

/** Per-position linear correction raw → actual. Identity until a position has `minRows` rows; slope kept in [0.5, 1.5]. */
export function fitCalibration(
    rows: { position: Position; raw: number; actual: number }[],
    minRows: number = MIN_CALIBRATION_ROWS,
): Record<Position, Calibration> {
    const result = {} as Record<Position, Calibration>

    for (const position of POSITIONS) {
        const mine = rows.filter((r) => r.position === position)

        if (mine.length < minRows) {
            result[position] = { ...IDENTITY }

            continue
        }

        const fit = fitLinear(
            mine.map((r) => r.raw),
            mine.map((r) => r.actual),
        )
        const slope = clamp(fit.slope, 0.5, 1.5)
        const intercept = mean(mine.map((r) => r.actual)) - slope * mean(mine.map((r) => r.raw))

        result[position] = { intercept, slope }
    }

    return result
}

/** Average FPL points of the player's last 5 appearances (minutes > 0) before `beforeEvent`; null without any. */
export function baselineFor(
    points: Map<number, { totalPoints: number; minutes: number }>,
    beforeEvent: number,
): number | null {
    const last = [...points.entries()]
        .filter(([event, p]) => event < beforeEvent && p.minutes > 0)
        .sort((a, b) => b[0] - a[0])
        .slice(0, BASELINE_APPEARANCES)

    return last.length === 0 ? null : mean(last.map(([, p]) => p.totalPoints))
}

export function passesBar(
    e: Pick<
        Evaluation,
        'eventsEvaluated' | 'playerEvents' | 'mae' | 'baselineMae' | 'rankCorr' | 'baselineRankCorr'
    >,
): { passed: boolean; reasons: string[] } {
    const reasons: string[] = []

    if (e.eventsEvaluated < BAR.minEvents) {
        reasons.push(`only ${e.eventsEvaluated} events evaluated, at least ${BAR.minEvents} needed`)
    }

    if (e.playerEvents < BAR.minPlayerEvents) {
        reasons.push(`only ${e.playerEvents} player-events evaluated, at least ${BAR.minPlayerEvents} needed`)
    }

    if (!(e.mae < e.baselineMae)) reasons.push('model MAE is not better than the baseline')

    if (!(e.rankCorr > e.baselineRankCorr))
        reasons.push('model rank correlation is not better than the baseline')

    return { passed: reasons.length === 0, reasons }
}

export interface WalkForwardRecord {
    event: number
    playerId: string
    position: Position
    raw: number
    predicted: number
    baseline: number
    actual: number
}

/**
 * Walk-forward v1 records against FPL actual points: for every one of the last finished events the forecast is
 * built from data before that event only and calibrated on earlier events only.
 */
export function walkForwardRecords(
    data: ForecastDataset,
    opts: { lastEvents?: number; params?: ModelParams } = {},
): { events: number[]; records: WalkForwardRecord[]; calibration: Record<Position, Calibration> } {
    const params = opts.params ?? DEFAULT_PARAMS
    const withPoints = new Set<number>()

    for (const perEvent of data.fplPoints.values()) for (const event of perEvent.keys()) withPoints.add(event)

    const events = data.events
        .filter((e) => e.finished && withPoints.has(e.id))
        .map((e) => e.id)
        .sort((a, b) => a - b)
        .slice(-(opts.lastEvents ?? 10))
    const records: WalkForwardRecord[] = []

    for (const event of events) {
        // Every earlier record is a calibration row; this event's records are added only after the loop body.
        const calibration = fitCalibration(records)
        const built = buildInputsForEvent(data, event, { useAvailability: false })
        const added: WalkForwardRecord[] = []

        for (const { playerId, input } of built.inputs) {
            if (input.fixtures.length === 0) continue

            const forecast = predictPlayer(input, params)

            if (forecast.expectedMinutes < MIN_EXPECTED_MINUTES) continue

            const points = data.fplPoints.get(playerId)
            const actual = points?.get(event)
            const baseline = points ? baselineFor(points, event) : null

            if (!actual || baseline === null) continue

            const c = calibration[input.position]

            added.push({
                event,
                playerId,
                position: input.position,
                raw: forecast.rawPoints,
                predicted: c.intercept + c.slope * forecast.rawPoints,
                baseline,
                actual: actual.totalPoints,
            })
        }

        records.push(...added)
    }

    return { events, records, calibration: fitCalibration(records) }
}

/** MAE over all rows and mean Spearman over event × position groups of at least `MIN_GROUP_SIZE` rows. */
export function pointsAccuracy<T extends { event: number; position: Position; actual: number }>(
    rows: T[],
    pick: (r: T) => number,
): { mae: number; rankCorr: number; rankGroups: number } {
    const groups = new Map<string, T[]>()

    for (const r of rows)
        groups.set(`${r.event}:${r.position}`, [...(groups.get(`${r.event}:${r.position}`) ?? []), r])

    const ranked = [...groups.values()].filter((g) => g.length >= MIN_GROUP_SIZE)

    return {
        mae: mae(
            rows.map(pick),
            rows.map((r) => r.actual),
        ),
        rankCorr: mean(
            ranked.map((g) =>
                spearman(
                    g.map(pick),
                    g.map((r) => r.actual),
                ),
            ),
        ),
        rankGroups: ranked.length,
    }
}

/** Backtest of v1 against FPL actual points with the stage-2 bar. */
export function evaluateWalkForward(
    data: ForecastDataset,
    opts: { lastEvents?: number; params?: ModelParams } = {},
): { evaluation: Evaluation; calibration: Record<Position, Calibration> } {
    const { events, records, calibration } = walkForwardRecords(data, opts)
    const model = pointsAccuracy(records, (r) => r.predicted)
    const baseline = pointsAccuracy(records, (r) => r.baseline)
    const evaluation: Evaluation = {
        modelVersion: MODEL_VERSION,
        eventsEvaluated: new Set(records.map((r) => r.event)).size,
        playerEvents: records.length,
        mae: model.mae,
        baselineMae: baseline.mae,
        rankCorr: model.rankCorr,
        baselineRankCorr: baseline.rankCorr,
        passed: false,
        reasons: [],
        details: {
            events,
            rankGroups: model.rankGroups,
            byPosition: Object.fromEntries(
                POSITIONS.map((p) => {
                    const mine = records.filter((r) => r.position === p)

                    return [
                        p,
                        {
                            n: mine.length,
                            mae: pointsAccuracy(mine, (r) => r.predicted).mae,
                            baselineMae: pointsAccuracy(mine, (r) => r.baseline).mae,
                        },
                    ]
                }),
            ),
        },
    }
    const bar = passesBar(evaluation)

    evaluation.passed = bar.passed
    evaluation.reasons = bar.reasons

    return { evaluation, calibration }
}

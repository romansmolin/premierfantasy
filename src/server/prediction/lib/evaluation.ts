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

interface Record_ {
    event: number
    position: Position
    raw: number
    predicted: number
    baseline: number
    actual: number
}

/**
 * Backtest against FPL actual points: for every one of the last finished events the forecast is built from data
 * before that event only and calibrated on earlier events only.
 */
export function evaluateWalkForward(
    data: ForecastDataset,
    opts: { lastEvents?: number; params?: ModelParams } = {},
): { evaluation: Evaluation; calibration: Record<Position, Calibration> } {
    const params = opts.params ?? DEFAULT_PARAMS
    const withPoints = new Set<number>()

    for (const perEvent of data.fplPoints.values()) for (const event of perEvent.keys()) withPoints.add(event)

    const events = data.events
        .filter((e) => e.finished && withPoints.has(e.id))
        .map((e) => e.id)
        .sort((a, b) => a - b)
        .slice(-(opts.lastEvents ?? 10))
    const records: Record_[] = []
    const rawRows: { position: Position; raw: number; actual: number }[] = []

    for (const event of events) {
        const calibration = fitCalibration(rawRows)
        const built = buildInputsForEvent(data, event, { useAvailability: false })
        const added: typeof rawRows = []

        for (const { playerId, input } of built.inputs) {
            if (input.fixtures.length === 0) continue

            const forecast = predictPlayer(input, params)

            if (forecast.expectedMinutes < MIN_EXPECTED_MINUTES) continue

            const points = data.fplPoints.get(playerId)
            const actual = points?.get(event)
            const baseline = points ? baselineFor(points, event) : null

            if (!actual || baseline === null) continue

            const c = calibration[input.position]

            records.push({
                event,
                position: input.position,
                raw: forecast.rawPoints,
                predicted: c.intercept + c.slope * forecast.rawPoints,
                baseline,
                actual: actual.totalPoints,
            })
            added.push({ position: input.position, raw: forecast.rawPoints, actual: actual.totalPoints })
        }

        rawRows.push(...added)
    }

    const groups = new Map<string, Record_[]>()

    for (const r of records)
        groups.set(`${r.event}:${r.position}`, [...(groups.get(`${r.event}:${r.position}`) ?? []), r])

    const ranked = [...groups.values()].filter((g) => g.length >= MIN_GROUP_SIZE)
    const evaluation: Evaluation = {
        modelVersion: MODEL_VERSION,
        eventsEvaluated: new Set(records.map((r) => r.event)).size,
        playerEvents: records.length,
        mae: mae(
            records.map((r) => r.predicted),
            records.map((r) => r.actual),
        ),
        baselineMae: mae(
            records.map((r) => r.baseline),
            records.map((r) => r.actual),
        ),
        rankCorr: mean(
            ranked.map((g) =>
                spearman(
                    g.map((r) => r.predicted),
                    g.map((r) => r.actual),
                ),
            ),
        ),
        baselineRankCorr: mean(
            ranked.map((g) =>
                spearman(
                    g.map((r) => r.baseline),
                    g.map((r) => r.actual),
                ),
            ),
        ),
        passed: false,
        reasons: [],
        details: {
            events,
            rankGroups: ranked.length,
            byPosition: Object.fromEntries(
                POSITIONS.map((p) => {
                    const mine = records.filter((r) => r.position === p)

                    return [
                        p,
                        {
                            n: mine.length,
                            mae: mae(
                                mine.map((r) => r.predicted),
                                mine.map((r) => r.actual),
                            ),
                            baselineMae: mae(
                                mine.map((r) => r.baseline),
                                mine.map((r) => r.actual),
                            ),
                        },
                    ]
                }),
            ),
        },
    }
    const bar = passesBar(evaluation)

    evaluation.passed = bar.passed
    evaluation.reasons = bar.reasons

    return { evaluation, calibration: fitCalibration(rawRows) }
}

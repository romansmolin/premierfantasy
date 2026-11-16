import { fitCalibration, walkForwardRecords } from '../evaluation'
import { FINISHED } from '../inputs'
import { mean } from '../math'
import { expectedGoals } from '../team-strength'

import { buildInputsV2 } from './inputs'
import { brier, brierMulti, calibrationBuckets, playerSeed } from './metrics'
import { bucketDistribution, predictPlayerMatches } from './model'
import { outcomeProbabilities } from './outcome'
import { bucketOfPoints, DEFAULT_V2, GATE, MODEL_VERSION_V2 } from './params'
import { pointsMeanCheck } from './points-mean'

import type { Calibration } from '../evaluation'
import type { DatasetFixture, ForecastDataset, FplMatchRow } from '../inputs'
import type { Position } from '../scoring-rules'
import type { TeamStrengths } from '../team-strength'
import type { V2Params } from './params'
import type { PointsMean, PointsRecord } from './points-mean'

export type Metric = 'goal' | 'assist' | 'start' | 'outcome' | 'points'
export type Horizon = 'next' | 'later'

export interface GateResult {
    metric: Metric
    horizon: Horizon
    position: Position | 'ALL'
    n: number
    brier: number
    baselineBrier: number
    buckets: ReturnType<typeof calibrationBuckets>
    passed: boolean
    reasons: string[]
}

export interface ProbabilityEvaluation {
    modelVersion: string
    eventsEvaluated: number
    gates: GateResult[]
    pointsMean: PointsMean
    calibration: Record<Position, Calibration>
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD']
const BINARY: Metric[] = ['goal', 'assist', 'start']
const MIN_EXPECTED_MINUTES = 30
const BASELINE_ROWS = 10
const MIN_BASELINE_ROWS = 5
const BACKTEST_SIMS = 400

/** One scored forecast: model and baseline probabilities per class (one probability for binary metrics) and the actual class. */
export interface Scored {
    metric: Metric
    horizon: Horizon
    position: Position | 'ALL'
    event: number
    p: number[]
    base: number[]
    actual: number
}

export interface CalibrationRow {
    playerId: string
    fixtureId: string
    kickoff: Date
    position: Position
    raw: number
    actual: number
}

export function passesGate(
    g: Pick<GateResult, 'n' | 'brier' | 'baselineBrier' | 'buckets'>,
    eventsEvaluated: number,
): { passed: boolean; reasons: string[] } {
    const reasons: string[] = []

    if (eventsEvaluated < GATE.minEvents) {
        reasons.push(`only ${eventsEvaluated} events evaluated, at least ${GATE.minEvents} needed`)
    }

    if (g.n < GATE.minRecords) reasons.push(`only ${g.n} records, at least ${GATE.minRecords} needed`)

    if (!(g.brier < g.baselineBrier - GATE.minBrierEdge)) {
        reasons.push(`Brier is not better than the baseline by ${GATE.minBrierEdge}`)
    }

    const off = g.buckets.filter(
        (b) => b.n >= GATE.minBucketN && Math.abs(b.predicted - b.observed) > GATE.maxBucketGap,
    )

    if (off.length > 0) {
        reasons.push(
            `calibration off by more than ${GATE.maxBucketGap} in bucket(s) ${off.map((b) => `${b.lo}–${b.hi}`).join(', ')}`,
        )
    }

    return { passed: reasons.length === 0, reasons }
}

export function isGateOn(
    gates: GateResult[],
    metric: Metric,
    horizon: Horizon,
    position?: Position,
): boolean {
    return (
        gates.find((g) => g.metric === metric && g.horizon === horizon && g.position === (position ?? 'ALL'))
            ?.passed ?? false
    )
}

function gateFor(metric: Metric, horizon: Horizon, position: Position | 'ALL', rows: Scored[]): GateResult {
    const binary = BINARY.includes(metric)
    const score = (pick: (r: Scored) => number[]) =>
        binary
            ? brier(
                  rows.map((r) => pick(r)[0]),
                  rows.map((r) => r.actual === 1),
              )
            : brierMulti(
                  rows.map(pick),
                  rows.map((r) => r.actual),
              )
    // Multi-class reliability pools every class probability against whether that class happened.
    const pairs = rows.flatMap((r) =>
        binary ? [{ p: r.p[0], hit: r.actual === 1 }] : r.p.map((p, k) => ({ p, hit: k === r.actual })),
    )
    const g = {
        n: rows.length,
        brier: score((r) => r.p),
        baselineBrier: score((r) => r.base),
        buckets: calibrationBuckets(
            pairs.map((x) => x.p),
            pairs.map((x) => x.hit),
        ),
    }

    return { metric, horizon, position, ...g, ...passesGate(g, new Set(rows.map((r) => r.event)).size) }
}

const isFinished = (f: DatasetFixture): boolean =>
    FINISHED.has(f.status) && f.homeGoals !== null && f.awayGoals !== null

/** 0 home win, 1 draw, 2 away win. */
const resultOf = (f: DatasetFixture): number => 1 - Math.sign((f.homeGoals ?? 0) - (f.awayGoals ?? 0))

/** Finished fixtures of events N…N+4 played after the cutoff, against league home/draw/away shares before it. */
function outcomeRows(data: ForecastDataset, event: number, cutoff: Date, strengths: TeamStrengths): Scored[] {
    const past = data.fixtures.filter((f) => f.kickoff < cutoff && isFinished(f))

    if (past.length === 0) return []

    const base = [0, 1, 2].map((k) => past.filter((f) => resultOf(f) === k).length / past.length)

    return data.fixtures
        .filter((f) => isFinished(f) && f.kickoff >= cutoff && f.fplEvent !== null)
        .filter((f) => (f.fplEvent as number) >= event && (f.fplEvent as number) <= event + 4)
        .map((f) => {
            const goals = expectedGoals(strengths, f.homeTeamId, f.awayTeamId, true)
            const o = outcomeProbabilities(goals.for, goals.against)

            return {
                metric: 'outcome',
                horizon: f.fplEvent === event ? 'next' : 'later',
                position: 'ALL',
                event,
                p: [o.home, o.draw, o.away],
                base,
                actual: resultOf(f),
            }
        })
}

/**
 * Walk-forward records of v2 against FPL per-match facts: every forecast for event N uses data before N's first
 * kickoff only; expected points are calibrated per position on earlier matches only. Exported for tests;
 * `calibrationMinRows` lets small test datasets exercise a fitted calibration.
 */
export function scoreEvents(
    data: ForecastDataset,
    opts: { lastEvents?: number; params?: V2Params; calibrationMinRows?: number } = {},
): {
    scored: Scored[]
    calibrationByEvent: Map<number, Record<Position, Calibration>>
    calibrationRows: CalibrationRow[]
    pointsRecords: PointsRecord[]
} {
    const base = opts.params ?? DEFAULT_V2
    const params = { ...base, sims: Math.min(base.sims, BACKTEST_SIMS) }
    const fixtureById = new Map(data.fixtures.map((f) => [f.fixtureId, f]))
    const withRows = new Set([...data.fplMatches.values()].flatMap((rows) => rows.map((r) => r.event)))
    const events = data.events
        .filter((e) => e.finished && withRows.has(e.id))
        .map((e) => e.id)
        .sort((a, b) => a - b)
        .slice(-(opts.lastEvents ?? 10))
    // v1 picks its events by FPL points, not FPL match rows; the comparison keeps only player-events both have.
    const v1 = new Map(
        walkForwardRecords(data, { lastEvents: opts.lastEvents }).records.map((r) => [
            `${r.event}:${r.playerId}`,
            r,
        ]),
    )
    const scored: Scored[] = []
    // Per-match calibration rows from team match 1 only, keyed by player and fixture: a team that blanks an
    // event has the same match 1 at two cutoffs, and the later forecast replaces the earlier one.
    const calibrationRows = new Map<string, CalibrationRow>()
    const calibrationByEvent = new Map<number, Record<Position, Calibration>>()
    const pointsRecords: PointsRecord[] = []

    for (const event of events) {
        const { cutoff, strengths, inputs } = buildInputsV2(data, event, { useAvailability: false })

        if (!cutoff || !strengths) continue

        // Rows of earlier events whose match was played after this cutoff would leak, so filter by kickoff.
        const calibration = fitCalibration(
            [...calibrationRows.values()].filter((r) => r.kickoff < cutoff),
            opts.calibrationMinRows,
        )

        calibrationByEvent.set(event, calibration)
        scored.push(...outcomeRows(data, event, cutoff, strengths))

        for (const { playerId, input } of inputs) {
            const seed = playerSeed(params.seed, playerId)
            const plain = predictPlayerMatches(input, params, { withDistribution: false, seed })

            if (!plain || plain.length === 0 || plain[0].expectedMinutes < MIN_EXPECTED_MINUTES) continue

            const { position } = input
            const c = calibration[position]
            const calibrated = (raw: number) => c.intercept + c.slope * raw
            const rows = data.fplMatches.get(playerId) ?? []
            const rowByFixture = new Map(rows.map((r) => [r.fixtureId, r]))
            const kickoffOf = (r: FplMatchRow) => fixtureById.get(r.fixtureId)?.kickoff.getTime() ?? Infinity
            const history = rows
                .filter((r) => kickoffOf(r) < cutoff.getTime())
                .sort((a, b) => kickoffOf(b) - kickoffOf(a))
                .slice(0, BASELINE_ROWS)
            const inEvent = plain.filter((f) => fixtureById.get(f.fixtureId)?.fplEvent === event)
            const v1Record = v1.get(`${event}:${playerId}`)

            if (v1Record && inEvent.length > 0) {
                pointsRecords.push({
                    event,
                    position,
                    v1: v1Record.predicted,
                    v2: inEvent.reduce((sum, f) => sum + calibrated(f.rawPoints), 0),
                    baseline: v1Record.baseline,
                    actual: v1Record.actual,
                })
            }

            // A missing FPL row is unknown, not a blank: such matches are skipped for the model and the baseline.
            const targets = plain.filter((f) => {
                const fixture = fixtureById.get(f.fixtureId)

                return rowByFixture.has(f.fixtureId) && fixture !== undefined && isFinished(fixture)
            })

            for (const f of targets.filter((t) => t.horizon === 1)) {
                calibrationRows.set(`${playerId}:${f.fixtureId}`, {
                    playerId,
                    fixtureId: f.fixtureId,
                    kickoff: fixtureById.get(f.fixtureId)?.kickoff ?? cutoff,
                    position,
                    raw: f.rawPoints,
                    actual: rowByFixture.get(f.fixtureId)?.totalPoints ?? 0,
                })
            }

            if (history.length < MIN_BASELINE_ROWS || targets.length === 0) continue

            const freq = (hit: (r: FplMatchRow) => boolean) => [mean(history.map((r) => (hit(r) ? 1 : 0)))]
            const baseDist = [0, 1, 2, 3].map((k) =>
                mean(history.map((r) => (bucketOfPoints(r.totalPoints) === k ? 1 : 0))),
            )
            const wanted = new Set(targets.map((t) => t.fixtureId))
            const full = predictPlayerMatches(input, params, { withDistribution: true, seed }) ?? []

            for (const f of full.filter((x) => wanted.has(x.fixtureId))) {
                const row = rowByFixture.get(f.fixtureId) as FplMatchRow
                const common = { horizon: f.horizon === 1 ? 'next' : 'later', position, event } as const
                const binary: [Metric, number, (r: FplMatchRow) => boolean][] = [
                    ['goal', f.pGoal, (r) => r.goals >= 1],
                    ['assist', f.pAssist, (r) => r.assists >= 1],
                    ['start', f.pStart, (r) => r.started],
                ]

                for (const [metric, p, hit] of binary) {
                    scored.push({ ...common, metric, p: [p], base: freq(hit), actual: hit(row) ? 1 : 0 })
                }

                scored.push({
                    ...common,
                    metric: 'points',
                    // Shift the simulated points so the distribution's mean is the calibrated expected points.
                    p: bucketDistribution(f.pointsSamples ?? [], calibrated(f.rawPoints) - f.rawPoints),
                    base: baseDist,
                    actual: bucketOfPoints(row.totalPoints),
                })
            }
        }
    }

    return { scored, calibrationByEvent, calibrationRows: [...calibrationRows.values()], pointsRecords }
}

/** Walk-forward backtest of v2 probabilities with a gate per metric × horizon × position. */
export function evaluateProbabilities(
    data: ForecastDataset,
    opts: { lastEvents?: number; params?: V2Params } = {},
): ProbabilityEvaluation {
    const { scored, calibrationRows, pointsRecords } = scoreEvents(data, opts)
    const gates: GateResult[] = []
    const of = (metric: Metric, horizon: Horizon, position: Position | 'ALL') =>
        scored.filter(
            (r) =>
                r.metric === metric &&
                r.horizon === horizon &&
                (position === 'ALL' || r.position === position),
        )

    for (const horizon of ['next', 'later'] as const) {
        for (const metric of ['goal', 'assist', 'start', 'points'] as const) {
            for (const position of [...POSITIONS, 'ALL'] as const) {
                gates.push(gateFor(metric, horizon, position, of(metric, horizon, position)))
            }
        }

        gates.push(gateFor('outcome', horizon, 'ALL', of('outcome', horizon, 'ALL')))
    }

    return {
        modelVersion: MODEL_VERSION_V2,
        eventsEvaluated: new Set(scored.map((r) => r.event)).size,
        gates,
        pointsMean: pointsMeanCheck(pointsRecords),
        calibration: fitCalibration(calibrationRows),
    }
}

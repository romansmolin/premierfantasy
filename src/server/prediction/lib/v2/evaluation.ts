import { baselineFor, fitCalibration, passesBar } from '../evaluation'
import { buildInputsForEvent, FINISHED } from '../inputs'
import { mae, mean, spearman } from '../math'
import { DEFAULT_PARAMS, predictPlayer } from '../model'
import { expectedGoals } from '../team-strength'

import { buildInputsV2 } from './inputs'
import { brier, brierMulti, calibrationBuckets } from './metrics'
import { bucketDistribution, predictPlayerMatches } from './model'
import { outcomeProbabilities } from './outcome'
import { bucketOfPoints, DEFAULT_V2, GATE, MODEL_VERSION_V2 } from './params'

import type { Calibration } from '../evaluation'
import type { DatasetFixture, ForecastDataset, FplMatchRow } from '../inputs'
import type { Position } from '../scoring-rules'
import type { TeamStrengths } from '../team-strength'
import type { V2Params } from './params'

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
    pointsMean: {
        passed: boolean
        maeV2: number
        maeV1: number
        rankCorrV2: number
        rankCorrV1: number
        n: number
        reasons: string[]
    }
    calibration: Record<Position, Calibration>
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD']
const BINARY: Metric[] = ['goal', 'assist', 'start']
const MIN_EXPECTED_MINUTES = 30
const BASELINE_ROWS = 10
const MIN_BASELINE_ROWS = 5
const BACKTEST_SIMS = 400
const MIN_GROUP_SIZE = 10

/** One scored forecast: model and baseline probabilities per class (one probability for binary metrics) and the actual class. */
interface Scored {
    metric: Metric
    horizon: Horizon
    position: Position | 'ALL'
    event: number
    p: number[]
    base: number[]
    actual: number
}

/** Event-level expected points of v1 and v2 on the same player-event, for the points-mean check. */
interface PointsRecord {
    event: number
    position: Position
    v1: number
    v2: number
    baseline: number
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

/** FNV-1a of the player id over the run seed: players draw independent samples, whatever the iteration order. */
const playerSeed = (seed: number, playerId: string): number =>
    [...playerId].reduce(
        (h, ch) => Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0,
        (seed ^ 0x811c9dc5) >>> 0,
    )

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

/** v1 records of one event exactly as `evaluateWalkForward` builds them (raw points, baseline, actual). */
function v1Records(data: ForecastDataset, event: number) {
    const result = new Map<string, { position: Position; raw: number; baseline: number; actual: number }>()

    for (const { playerId, input } of buildInputsForEvent(data, event, { useAvailability: false }).inputs) {
        if (input.fixtures.length === 0) continue

        // v1 as it ships, whatever v2 params are being tried.
        const forecast = predictPlayer(input, DEFAULT_PARAMS)

        if (forecast.expectedMinutes < MIN_EXPECTED_MINUTES) continue

        const points = data.fplPoints.get(playerId)
        const actual = points?.get(event)
        const baseline = points ? baselineFor(points, event) : null

        if (!actual || baseline === null) continue

        result.set(playerId, {
            position: input.position,
            raw: forecast.rawPoints,
            baseline,
            actual: actual.totalPoints,
        })
    }

    return result
}

function pointsMeanCheck(records: PointsRecord[]): ProbabilityEvaluation['pointsMean'] {
    const groups = new Map<string, PointsRecord[]>()

    for (const r of records) {
        const key = `${r.event}:${r.position}`

        groups.set(key, [...(groups.get(key) ?? []), r])
    }

    const ranked = [...groups.values()].filter((g) => g.length >= MIN_GROUP_SIZE)
    const maeOf = (pick: (r: PointsRecord) => number) =>
        mae(
            records.map(pick),
            records.map((r) => r.actual),
        )
    const rankOf = (pick: (r: PointsRecord) => number) =>
        mean(
            ranked.map((g) =>
                spearman(
                    g.map(pick),
                    g.map((r) => r.actual),
                ),
            ),
        )
    const result = {
        maeV2: maeOf((r) => r.v2),
        maeV1: maeOf((r) => r.v1),
        rankCorrV2: rankOf((r) => r.v2),
        rankCorrV1: rankOf((r) => r.v1),
        n: records.length,
    }
    // v2 points must clear the stage-2 bar and be no worse than v1 on the same records.
    const { reasons } = passesBar({
        eventsEvaluated: new Set(records.map((r) => r.event)).size,
        playerEvents: records.length,
        mae: result.maeV2,
        baselineMae: maeOf((r) => r.baseline),
        rankCorr: result.rankCorrV2,
        baselineRankCorr: rankOf((r) => r.baseline),
    })

    if (!(result.maeV2 <= result.maeV1)) reasons.push('v2 MAE is worse than v1 on the same records')

    if (!(result.rankCorrV2 >= result.rankCorrV1)) {
        reasons.push('v2 rank correlation is worse than v1 on the same records')
    }

    return { ...result, passed: reasons.length === 0, reasons }
}

/**
 * Walk-forward backtest of v2 probabilities against FPL per-match facts: every forecast for event N uses data
 * before N's first kickoff only; expected points are calibrated per position on earlier matches only.
 */
export function evaluateProbabilities(
    data: ForecastDataset,
    opts: { lastEvents?: number; params?: V2Params } = {},
): ProbabilityEvaluation {
    const base = opts.params ?? DEFAULT_V2
    const params = { ...base, sims: Math.min(base.sims, BACKTEST_SIMS) }
    const fixtureById = new Map(data.fixtures.map((f) => [f.fixtureId, f]))
    const withRows = new Set([...data.fplMatches.values()].flatMap((rows) => rows.map((r) => r.event)))
    const events = data.events
        .filter((e) => e.finished && withRows.has(e.id))
        .map((e) => e.id)
        .sort((a, b) => a - b)
        .slice(-(opts.lastEvents ?? 10))
    const scored: Scored[] = []
    // Per-match calibration rows from team match 1 only: the horizon the points are shown for first.
    const calibrationRows: { kickoff: Date; position: Position; raw: number; actual: number }[] = []
    const v1Rows: { position: Position; raw: number; actual: number }[] = []
    const pointsRecords: PointsRecord[] = []

    for (const event of events) {
        const { cutoff, strengths, inputs } = buildInputsV2(data, event, { useAvailability: false })

        if (!cutoff || !strengths) continue

        // Rows of earlier events whose match was played after this cutoff would leak, so filter by kickoff.
        const calibration = fitCalibration(calibrationRows.filter((r) => r.kickoff < cutoff))
        const v1Calibration = fitCalibration(v1Rows)
        const v1 = v1Records(data, event)

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
            const v1Record = v1.get(playerId)

            if (v1Record && inEvent.length > 0) {
                const v1c = v1Calibration[position]

                pointsRecords.push({
                    event,
                    position,
                    v1: v1c.intercept + v1c.slope * v1Record.raw,
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
                calibrationRows.push({
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

        for (const r of v1.values()) v1Rows.push(r)
    }

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

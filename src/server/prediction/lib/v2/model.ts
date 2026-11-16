import {
    clamp,
    decayWeights,
    expectedHalfConceded,
    mean,
    poissonAtLeast,
    poissonPmf,
    weightedMean,
} from '../math'
import { rates } from '../model'
import { FPL_RULES, pointsFromStats } from '../scoring-rules'

import { mulberry32, samplePoisson } from './metrics'
import { bucketOfPoints, MIN_APPEARANCES } from './params'

import type { FixtureContext, MatchLine, PositionPrior, RateKey } from '../model'
import type { Position } from '../scoring-rules'
import type { V2Params } from './params'

export interface V2Line extends MatchLine {
    xg: number | null
    xa: number | null
    started: boolean
}

export interface V2Fixture extends FixtureContext {
    fixtureId: string
    kickoff: Date
    opponentTeamId: string
}

export interface PlayerInputV2 {
    position: Position
    /** Newest first, only matches with minutes > 0, at most 10. */
    appearances: V2Line[]
    /** The team's last matches, newest first, up to 6; minutes 0 when the player was absent. */
    teamMatches: { minutes: number; started: boolean }[]
    /** 0..1, 0 = out. */
    availability: number
    /** At most 5, in kickoff order. */
    fixtures: V2Fixture[]
    prior: PositionPrior
}

export interface MatchForecastV2 {
    fixtureId: string
    horizon: number
    pStart: number
    pPlay: number
    expectedMinutes: number
    pGoal: number
    pAssist: number
    /** Expected points without bonus, before calibration: the exact mean of the simulated distribution. */
    rawPoints: number
    pointsSamples: number[] | null
}

const DEFAULT_START_MINUTES = 80
const DEFAULT_SUB_MINUTES = 20

/** E[floor(X / k)] for X ~ Poisson(lambda). */
function expectedFloor(lambda: number, k: number): number {
    let total = 0

    for (let x = k; x <= lambda + 10 * Math.sqrt(lambda) + 20; x += 1)
        total += poissonPmf(x, lambda) * Math.floor(x / k)

    return total
}

const atLeastOne = (lambda: number): number => 1 - Math.exp(-lambda)

interface Role {
    p: number
    minutes: number
}

/** Per-90 rates scaled to one role's minutes in one fixture. */
function roleLambdas(r: Record<RateKey, number>, minutes: number, attack: number, goalsAgainst: number) {
    const share = minutes / 90

    return {
        goals: r.goals * share * attack,
        assists: r.assists * share * attack,
        saves: r.saves * share,
        defensive: r.defensiveActions * share,
        yellow: atLeastOne(r.yellowCards * share),
        red: atLeastOne(r.redCards * share),
        // Only goals conceded while the player is on the pitch count for his clean sheet and conceded penalty.
        conceded: goalsAgainst * share,
    }
}

type Lambdas = ReturnType<typeof roleLambdas>

function expectedRolePoints(position: Position, minutes: number, l: Lambdas): number {
    const full = minutes >= FPL_RULES.fullMinutes
    const threshold = FPL_RULES.dcThreshold[position]
    let points = full ? FPL_RULES.appearanceFull : FPL_RULES.appearanceShort

    points += l.goals * FPL_RULES.goal[position] + l.assists * FPL_RULES.assist
    points += l.yellow * FPL_RULES.yellowCard + l.red * FPL_RULES.redCard

    if (full) points += Math.exp(-l.conceded) * FPL_RULES.cleanSheet[position]

    if (position === 'GK' || position === 'DEF') points -= expectedHalfConceded(l.conceded)

    if (position === 'GK') points += expectedFloor(l.saves, FPL_RULES.savesPerPoint)

    if (threshold !== null) points += poissonAtLeast(threshold, l.defensive) * FPL_RULES.dcPoints

    return points
}

function sampleRolePoints(position: Position, minutes: number, l: Lambdas, rng: () => number): number {
    const goalsConceded = samplePoisson(l.conceded, rng)

    return pointsFromStats({
        position,
        minutes,
        goals: samplePoisson(l.goals, rng),
        assists: samplePoisson(l.assists, rng),
        cleanSheet: goalsConceded === 0,
        goalsConceded,
        saves: samplePoisson(l.saves, rng),
        penaltiesSaved: 0,
        penaltiesMissed: 0,
        ownGoals: 0,
        yellowCards: rng() < l.yellow ? 1 : 0,
        redCards: rng() < l.red ? 1 : 0,
        defensiveActions: samplePoisson(l.defensive, rng),
    })
}

/** Goals and assists replaced by the xG/xA blend where FPL data is known. */
const blendLine = (a: V2Line, w: number): MatchLine => ({
    ...a,
    goals: a.xg === null ? a.goals : w * a.xg + (1 - w) * a.goals,
    assists: a.xa === null ? a.assists : w * a.xa + (1 - w) * a.assists,
})

/** Per-match forecasts for the player's next fixtures; null on cold start. */
export function predictPlayerMatches(
    input: PlayerInputV2,
    params: V2Params,
    opts: { withDistribution: boolean; seed: number },
): MatchForecastV2[] | null {
    if (input.appearances.length < MIN_APPEARANCES) return null

    const { position, availability, teamMatches } = input
    const mw = decayWeights(teamMatches.length, params.minutesDecay)
    const pPlay =
        availability *
        weightedMean(
            teamMatches.map((m) => (m.minutes > 0 ? 1 : 0)),
            mw,
        )
    // A start always has minutes, so this only guards inconsistent data.
    const pStart = Math.min(
        pPlay,
        availability *
            weightedMean(
                teamMatches.map((m) => (m.started ? 1 : 0)),
                mw,
            ),
    )
    const starts = input.appearances.filter((a) => a.started).map((a) => a.minutes)
    const subs = input.appearances.filter((a) => !a.started).map((a) => a.minutes)
    const roles: Role[] = [
        { p: pStart, minutes: starts.length > 0 ? mean(starts) : DEFAULT_START_MINUTES },
        { p: pPlay - pStart, minutes: subs.length > 0 ? mean(subs) : DEFAULT_SUB_MINUTES },
    ]
    const expectedMinutes = roles.reduce((sum, role) => sum + role.p * role.minutes, 0)
    const r = rates(
        input.appearances.map((a) => blendLine(a, params.xgWeight)),
        input.prior,
        params,
    )

    return input.fixtures.map((f, i) => {
        const attack =
            f.teamBaselineGoals > 0
                ? clamp(f.teamGoalsFor / f.teamBaselineGoals, params.attackClamp[0], params.attackClamp[1])
                : 1
        const lambdas = roles.map((role) => roleLambdas(r, role.minutes, attack, f.teamGoalsAgainst))
        const lambdaGoals = roles.reduce((sum, role, k) => sum + role.p * lambdas[k].goals, 0)
        const lambdaAssists = roles.reduce((sum, role, k) => sum + role.p * lambdas[k].assists, 0)
        const rawPoints = roles.reduce(
            (sum, role, k) => sum + role.p * expectedRolePoints(position, role.minutes, lambdas[k]),
            0,
        )
        let pointsSamples: number[] | null = null

        if (opts.withDistribution) {
            // Seeded per match so samples do not depend on which other players or fixtures were simulated.
            const rng = mulberry32((opts.seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0)

            pointsSamples = Array.from({ length: params.sims }, () => {
                const u = rng()
                const k = u < pStart ? 0 : u < pPlay ? 1 : -1

                return k < 0 ? 0 : sampleRolePoints(position, roles[k].minutes, lambdas[k], rng)
            })
        }

        return {
            fixtureId: f.fixtureId,
            horizon: i + 1,
            pStart,
            pPlay,
            expectedMinutes,
            // λ = rate · expectedMinutes/90 · attack, the role-weighted sum above.
            pGoal: atLeastOne(lambdaGoals),
            pAssist: atLeastOne(lambdaAssists),
            rawPoints,
            pointsSamples,
        }
    })
}

/** Shares of the four point buckets after adding `shift` to each sample and rounding. */
export function bucketDistribution(samples: number[], shift: number): [number, number, number, number] {
    const counts: [number, number, number, number] = [0, 0, 0, 0]

    for (const s of samples) counts[bucketOfPoints(Math.round(s + shift))] += 1

    return counts.map((c) => c / Math.max(1, samples.length)) as [number, number, number, number]
}

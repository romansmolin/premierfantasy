import { clamp, decayWeights, expectedHalfConceded, poissonAtLeast, shrunkRate, weightedMean } from './math'
import { FPL_RULES } from './scoring-rules'

import type { Position } from './scoring-rules'

export const MODEL_VERSION = 'ewma-poisson-v1'

export interface MatchLine {
    minutes: number
    goals: number
    assists: number
    saves: number
    yellowCards: number
    redCards: number
    /** Tackles + blocks + interceptions (API-Football has no clearances or recoveries). */
    defensiveActions: number
}

/** League-wide rates per 90 minutes for a position. */
export interface PositionPrior {
    goals: number
    assists: number
    saves: number
    yellowCards: number
    redCards: number
    defensiveActions: number
}

export interface FixtureContext {
    isHome: boolean
    /** Expected goals of the player's team in this fixture. */
    teamGoalsFor: number
    teamGoalsAgainst: number
    /** The team's own recent goals per match, the reference for the attacking multiplier. */
    teamBaselineGoals: number
}

export interface PlayerInput {
    position: Position
    /** Newest first, only matches with minutes > 0, at most 10. */
    appearances: MatchLine[]
    /** Minutes in the team's last matches, newest first, 0 when the player was absent. */
    teamMatchMinutes: number[]
    /** 0..1, 0 = out. */
    availability: number
    /** Empty in a blank gameweek. */
    fixtures: FixtureContext[]
    prior: PositionPrior
}

export interface ModelParams {
    /** Weight of each older appearance when estimating rates. */
    decay: number
    /** Weight of each older team match when estimating minutes. */
    minutesDecay: number
    /** Pseudo-observation of the position prior, in 90-minute units. */
    priorMinutes90: number
    attackClamp: [number, number]
}

export const DEFAULT_PARAMS: ModelParams = {
    decay: 0.85,
    minutesDecay: 0.8,
    priorMinutes90: 3,
    attackClamp: [0.6, 1.8],
}

export interface PlayerForecast {
    expectedMinutes: number
    rawPoints: number
    components: Record<string, number>
}

export type RateKey = keyof PositionPrior

export function rates(
    appearances: MatchLine[],
    prior: PositionPrior,
    params: ModelParams,
): Record<RateKey, number> {
    const w = decayWeights(appearances.length, params.decay)
    const exposure = appearances.reduce((sum, a, i) => sum + (w[i] * a.minutes) / 90, 0)
    const keys: RateKey[] = ['goals', 'assists', 'saves', 'yellowCards', 'redCards', 'defensiveActions']

    return Object.fromEntries(
        keys.map((key) => {
            const total = appearances.reduce((sum, a, i) => sum + w[i] * a[key], 0)

            return [key, shrunkRate(total, exposure, prior[key], params.priorMinutes90)]
        }),
    ) as Record<RateKey, number>
}

/** Expected FPL points (without bonus, before calibration) of one player for one gameweek. */
export function predictPlayer(input: PlayerInput, params: ModelParams = DEFAULT_PARAMS): PlayerForecast {
    const { position, availability, prior } = input
    const mw = decayWeights(input.teamMatchMinutes.length, params.minutesDecay)
    const pPlay =
        availability *
        weightedMean(
            input.teamMatchMinutes.map((m) => (m > 0 ? 1 : 0)),
            mw,
        )
    const p60 =
        availability *
        weightedMean(
            input.teamMatchMinutes.map((m) => (m >= FPL_RULES.fullMinutes ? 1 : 0)),
            mw,
        )
    const expMin = availability * weightedMean(input.teamMatchMinutes, mw)
    const minutesIfPlaying = pPlay > 0.01 ? Math.min(90, expMin / pPlay) : 0
    const r = rates(input.appearances, prior, params)
    const dcThreshold = FPL_RULES.dcThreshold[position]
    const components: Record<string, number> = {
        appearance: 0,
        goals: 0,
        assists: 0,
        cleanSheet: 0,
        conceded: 0,
        saves: 0,
        cards: 0,
        defensive: 0,
    }

    for (const f of input.fixtures) {
        const attack =
            f.teamBaselineGoals > 0
                ? clamp(f.teamGoalsFor / f.teamBaselineGoals, params.attackClamp[0], params.attackClamp[1])
                : 1
        const share = expMin / 90

        components.appearance +=
            pPlay * FPL_RULES.appearanceShort + p60 * (FPL_RULES.appearanceFull - FPL_RULES.appearanceShort)
        components.goals += r.goals * share * attack * FPL_RULES.goal[position]
        components.assists += r.assists * share * attack * FPL_RULES.assist
        components.cleanSheet += Math.exp(-f.teamGoalsAgainst) * p60 * FPL_RULES.cleanSheet[position]

        if (position === 'GK' || position === 'DEF') {
            components.conceded -= expectedHalfConceded(f.teamGoalsAgainst) * share
        }

        if (position === 'GK') components.saves += (r.saves * share) / FPL_RULES.savesPerPoint

        components.cards -= (r.yellowCards * -FPL_RULES.yellowCard + r.redCards * -FPL_RULES.redCard) * share

        if (dcThreshold !== null) {
            components.defensive +=
                pPlay *
                poissonAtLeast(dcThreshold, (r.defensiveActions * minutesIfPlaying) / 90) *
                FPL_RULES.dcPoints
        }
    }

    const rawPoints = Object.values(components).reduce((a, b) => a + b, 0)

    return { expectedMinutes: expMin * input.fixtures.length, rawPoints, components }
}

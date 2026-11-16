import { FINISHED } from '@/server/prediction/lib/inputs'
import { isGateOn } from '@/server/prediction/lib/v2/evaluation'
import { MODEL_VERSION_V2 } from '@/server/prediction/lib/v2/params'

import { explainForecast } from './explain'
import { gated, gateHorizon } from './gating'

import type { ExplainFacts } from './explain'
import type { StatsFixture } from '../repository/stats.repository.interface'
import type { PlayerProbabilityCard } from '../service/stats.service.interface'
import type { Position } from '@/server/prediction/lib/scoring-rules'
import type { GateResult, Metric } from '@/server/prediction/lib/v2/evaluation'
import type {
    FixtureProbabilityRow,
    PlayerMatchProbability,
} from '@/server/prediction/repository/probability.repository.interface'
import type { ProbabilityStatus } from '@/server/prediction/service/probability.service.interface'

/** A stored fixture is worth showing when it is still to be played (the table keeps old rows when no event is upcoming). */
export const isUpcoming = (f: StatsFixture | undefined, now: Date): f is StatsFixture =>
    f !== undefined && (f.kickoff.getTime() > now.getTime() || !FINISHED.has(f.status))

const METRIC_LABEL: Record<Metric, string> = {
    goal: 'Goal chance',
    assist: 'Assist chance',
    start: 'Starting chance',
    outcome: 'Match result chances',
    points: 'Points distribution',
}

export interface CardInput {
    position: Position
    clubId: string
    rows: PlayerMatchProbability[]
    fixtures: Map<string, StatsFixture>
    fixtureProbs: Map<string, FixtureProbabilityRow>
    status: ProbabilityStatus
    lowData: boolean
    /** Expected points of the v1 forecast for the next event; null when v1 is off. */
    v1Points: number | null
    facts: ExplainFacts
    now: Date
}

const reasonOf = (gates: GateResult[], metric: Metric, horizon: 'next' | 'later', position?: Position) => {
    const g = gates.find(
        (x) => x.metric === metric && x.horizon === horizon && x.position === (position ?? 'ALL'),
    )

    return `${METRIC_LABEL[metric]} (${horizon === 'next' ? 'next match' : 'later matches'}): ${
        g ? g.reasons.join('; ') || 'not reliable enough yet' : 'not evaluated'
    }`
}

/** The per-match probability card of one player: every number is null when its gate is off or the player has too little data. */
export function buildProbabilityCard(input: CardInput): PlayerProbabilityCard | null {
    const { position, clubId, status, lowData, now } = input
    const { gates, pointsMeanOn } = status

    if (status.evaluatedAt === null || status.updatedAt === null) return null

    const shown = input.rows
        .filter((r) => isUpcoming(input.fixtures.get(r.fixtureId), now))
        .sort((a, b) => a.horizon - b.horizon)

    if (shown.length === 0 && !lowData) return null

    const off = new Set<string>()

    const on = (metric: Metric, horizon: number): boolean => {
        const h = gateHorizon(horizon)
        const ok = isGateOn(gates, metric, h, metric === 'outcome' ? undefined : position)

        if (!ok) off.add(reasonOf(gates, metric, h, metric === 'outcome' ? undefined : position))

        return ok
    }

    const matches = shown.map((r): PlayerProbabilityCard['matches'][number] => {
        const f = input.fixtures.get(r.fixtureId) as StatsFixture
        const isHome = f.home.id === clubId
        const fp = input.fixtureProbs.get(r.fixtureId)
        const show = !lowData
        const outcome = show && on('outcome', r.horizon)
        const start = show && on('start', r.horizon)
        const pointsOn = show && pointsMeanOn && on('points', r.horizon)

        if (show && !pointsMeanOn)
            off.add('Points distribution: the new points model is not better than the current forecast')

        return {
            fixtureId: r.fixtureId,
            kickoff: f.kickoff,
            opponentName: isHome ? f.away.name : f.home.name,
            isHome,
            horizon: r.horizon,
            pGoal: gated(r.pGoal, show && on('goal', r.horizon)),
            pAssist: gated(r.pAssist, show && on('assist', r.horizon)),
            pStart: gated(r.pStart, start),
            expectedMinutes: gated(r.expectedMinutes, start),
            // Horizon 1: v2 when it beats v1, else the v1 forecast (already null when v1 is off); later horizons need the points gate.
            expectedPoints: !show
                ? null
                : r.horizon === 1
                  ? pointsMeanOn
                      ? r.expectedPoints
                      : input.v1Points
                  : gated(r.expectedPoints, pointsOn),
            pointsBuckets: pointsOn ? r.pointsBuckets : null,
            pWin: fp ? gated(isHome ? fp.pHome : fp.pAway, outcome) : null,
            pDraw: fp ? gated(fp.pDraw, outcome) : null,
            pLose: fp ? gated(isHome ? fp.pAway : fp.pHome, outcome) : null,
        }
    })
    const first = shown[0]
    const firstProb = first ? input.fixtureProbs.get(first.fixtureId) : undefined
    const firstFixture = first ? input.fixtures.get(first.fixtureId) : undefined
    const teamGoals =
        !lowData && firstProb && firstFixture && isGateOn(gates, 'outcome', gateHorizon(first.horizon))
            ? {
                  expectedTeamGoals: firstFixture.home.id === clubId ? firstProb.xgHome : firstProb.xgAway,
                  leagueGoals: firstProb.leagueGoals,
              }
            : { expectedTeamGoals: null, leagueGoals: null }

    return {
        modelVersion: MODEL_VERSION_V2,
        updatedAt: status.updatedAt,
        lowData,
        matches,
        explanation: explainForecast({ ...input.facts, ...teamGoals }),
        offReasons: lowData ? ['Too few appearances to forecast this player yet'] : [...off],
    }
}

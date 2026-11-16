import { expectedGoals } from '../lib/team-strength'
import { evaluateProbabilities } from '../lib/v2/evaluation'
import { buildInputsV2 } from '../lib/v2/inputs'
import { playerSeed } from '../lib/v2/metrics'
import { bucketDistribution, predictPlayerMatches } from '../lib/v2/model'
import { outcomeProbabilities } from '../lib/v2/outcome'
import { DEFAULT_V2 } from '../lib/v2/params'

import type { IProbabilityService, ProbabilityStatus } from './probability.service.interface'
import type { IForecastDataRepository } from '../repository/forecast-data.repository.interface'
import type {
    FixtureProbabilityRow,
    IProbabilityRepository,
    PlayerMatchProbability,
} from '../repository/probability.repository.interface'
import type { JobOutcome } from '@/server/sync/lib/job.types'

/** Events ahead (the next one included) whose fixtures get outcome probabilities. */
const OUTCOME_EVENTS = 8

const round = (x: number, digits = 3): number => Math.round(x * 10 ** digits) / 10 ** digits

export class ProbabilityService implements IProbabilityService {
    private readonly dataRepo: IForecastDataRepository
    private readonly repo: IProbabilityRepository
    private readonly now: () => Date

    constructor(
        dataRepo: IForecastDataRepository,
        repo: IProbabilityRepository,
        now: () => Date = () => new Date(),
    ) {
        this.dataRepo = dataRepo
        this.repo = repo
        this.now = now
    }

    async run(): Promise<JobOutcome> {
        const data = await this.dataRepo.loadDataset()

        if (data.events.length === 0) throw new Error('No FPL events stored: run fpl-bootstrap first')

        // Nothing is stored before the evaluation and every prediction below have succeeded, so a failure keeps the old rows.
        const evaluation = evaluateProbabilities(data)

        await this.repo.saveEvaluation(evaluation)

        const stats = {
            eventsEvaluated: evaluation.eventsEvaluated,
            pointsMeanOn: evaluation.pointsMean.passed ? 1 : 0,
            gatesOn: evaluation.gates.filter((g) => g.passed).length,
            matchProbabilities: 0,
            fixtureProbabilities: 0,
        }
        const built = buildInputsV2(data, 'next', { useAvailability: true })

        // No upcoming event (end of season) or no fixtures scheduled yet: nothing to predict, not an error.
        if (built.event === null || built.cutoff === null || built.strengths === null) {
            return { status: 'OK', stats }
        }

        const matches: PlayerMatchProbability[] = []

        for (const { playerId, input } of built.inputs) {
            const forecasts = predictPlayerMatches(input, DEFAULT_V2, {
                withDistribution: true,
                seed: playerSeed(DEFAULT_V2.seed, playerId),
            })

            if (!forecasts) continue

            const c = evaluation.calibration[input.position]

            for (const f of forecasts) {
                const playing = f.expectedMinutes > 0
                const calibrated = playing ? Math.max(0, c.intercept + c.slope * f.rawPoints) : 0

                matches.push({
                    fixtureId: f.fixtureId,
                    playerId,
                    horizon: f.horizon,
                    pGoal: round(f.pGoal),
                    pAssist: round(f.pAssist),
                    pStart: round(f.pStart),
                    expectedMinutes: round(f.expectedMinutes),
                    expectedPoints: round(calibrated),
                    pointsBuckets: bucketDistribution(f.pointsSamples ?? [], calibrated - f.rawPoints).map(
                        (b) => round(b),
                    ),
                })
            }
        }

        const now = this.now()
        const { strengths } = built
        const first = built.event
        const fixtures: FixtureProbabilityRow[] = data.fixtures
            .filter(
                (f) =>
                    f.fplEvent !== null &&
                    f.fplEvent >= first &&
                    f.fplEvent < first + OUTCOME_EVENTS &&
                    f.kickoff > now,
            )
            .map((f) => {
                const goals = expectedGoals(strengths, f.homeTeamId, f.awayTeamId, true)
                const o = outcomeProbabilities(goals.for, goals.against)

                return {
                    fixtureId: f.fixtureId,
                    pHome: round(o.home),
                    pDraw: round(o.draw),
                    pAway: round(o.away),
                    xgHome: round(goals.for),
                    xgAway: round(goals.against),
                    leagueGoals: round(strengths.leagueGoalsPerTeam),
                }
            })

        await this.repo.replaceMatchProbabilities(matches)
        await this.repo.replaceFixtureProbabilities(fixtures)

        return {
            status: 'OK',
            stats: { ...stats, matchProbabilities: matches.length, fixtureProbabilities: fixtures.length },
        }
    }

    async getStatus(): Promise<ProbabilityStatus> {
        const [latest, updatedAt] = await Promise.all([
            this.repo.findLatestEvaluation(),
            this.repo.findLatestUpdate(),
        ])

        return {
            evaluatedAt: latest?.createdAt ?? null,
            eventsEvaluated: latest?.eventsEvaluated ?? 0,
            gates: latest?.gates ?? [],
            pointsMeanOn: latest?.pointsMean.passed ?? false,
            // The evaluation is saved before the rows, so only the rows say how fresh the data is.
            updatedAt,
        }
    }

    getPlayerMatches(playerId: string): Promise<PlayerMatchProbability[]> {
        return this.repo.findMatchProbabilities(playerId)
    }

    async getNextMatchForAll(): Promise<Map<string, PlayerMatchProbability>> {
        const rows = await this.repo.findMatchProbabilities()

        return new Map(rows.filter((r) => r.horizon === 1).map((r) => [r.playerId, r]))
    }

    getFixtureProbabilities(fixtureIds?: string[]): Promise<FixtureProbabilityRow[]> {
        return this.repo.findFixtureProbabilities(fixtureIds)
    }
}

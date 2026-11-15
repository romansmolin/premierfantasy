import { evaluateWalkForward } from '../lib/evaluation'
import { buildInputsForEvent } from '../lib/inputs'
import { MODEL_VERSION, predictPlayer } from '../lib/model'

import type { ForecastStatus, IForecastService } from './forecast.service.interface'
import type { IForecastDataRepository } from '../repository/forecast-data.repository.interface'
import type { IForecastRepository, PredictionRow } from '../repository/forecast.repository.interface'
import type { JobOutcome } from '@/server/sync/lib/job.types'

const round = (x: number, digits = 3): number => Math.round(x * 10 ** digits) / 10 ** digits

export class ForecastService implements IForecastService {
    private readonly dataRepo: IForecastDataRepository
    private readonly repo: IForecastRepository

    constructor(dataRepo: IForecastDataRepository, repo: IForecastRepository) {
        this.dataRepo = dataRepo
        this.repo = repo
    }

    async run(): Promise<JobOutcome> {
        const data = await this.dataRepo.loadDataset()

        if (data.events.length === 0) throw new Error('No FPL events stored: run fpl-bootstrap first')

        const { evaluation, calibration } = evaluateWalkForward(data)

        await this.repo.saveEvaluation(evaluation)

        const stats = {
            eventsEvaluated: evaluation.eventsEvaluated,
            playerEvents: evaluation.playerEvents,
            passed: evaluation.passed ? 1 : 0,
            maeX100: Math.round(evaluation.mae * 100),
            baselineMaeX100: Math.round(evaluation.baselineMae * 100),
            predictions: 0,
        }
        const built = buildInputsForEvent(data, 'next', { useAvailability: true })

        // No upcoming event (end of season) or no fixtures scheduled yet: nothing to predict, not an error.
        if (built.event === null || built.cutoff === null) return { status: 'OK', stats }

        const rows: PredictionRow[] = []

        for (const { playerId, input } of built.inputs) {
            if (input.fixtures.length === 0) continue

            const forecast = predictPlayer(input)
            const c = calibration[input.position]
            const playing = forecast.expectedMinutes > 0

            rows.push({
                playerId,
                expectedMinutes: round(forecast.expectedMinutes),
                expectedPoints: playing ? round(Math.max(0, c.intercept + c.slope * forecast.rawPoints)) : 0,
                rawPoints: round(forecast.rawPoints),
                components: Object.fromEntries(
                    Object.entries(forecast.components).map(([k, v]) => [k, round(v)]),
                ),
            })
        }

        await this.repo.replacePredictions(built.event, MODEL_VERSION, rows)

        return { status: 'OK', stats: { ...stats, predictions: rows.length } }
    }

    async getStatus(): Promise<ForecastStatus> {
        const [evaluation, nextEvent] = await Promise.all([
            this.repo.findLatestEvaluation(MODEL_VERSION),
            this.repo.findNextEventId(),
        ])

        // Passing the bar is not enough: with nothing predicted for the next event (failed or late sync) every consumer would see empty forecasts.
        const predicted = nextEvent === null ? 0 : await this.repo.countPredictions(nextEvent, MODEL_VERSION)

        return { enabled: evaluation?.passed === true && predicted > 0, nextEvent, evaluation }
    }
}

import type { Evaluation } from '../lib/evaluation'
import type { JobOutcome } from '@/server/sync/lib/job.types'

export interface ForecastStatus {
    /** True when the latest stored evaluation of the current model passed the accuracy bar. */
    enabled: boolean
    nextEvent: number | null
    evaluation: (Evaluation & { createdAt: Date }) | null
}

export interface IForecastService {
    /** Evaluates the model, stores the evaluation and the predictions of the next event. */
    run(): Promise<JobOutcome>
    getStatus(): Promise<ForecastStatus>
}

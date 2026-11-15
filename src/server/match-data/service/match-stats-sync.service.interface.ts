import type { JobOutcome } from '@/server/sync/lib/job.types'
import type { RequestBudget } from '@/server/sync/lib/request-budget'

export interface IMatchStatsSyncService {
    /** Seasons are processed in the order given (current first). One API request per fixture. */
    syncMatchStats(seasons: number[], budget: RequestBudget): Promise<JobOutcome>
}

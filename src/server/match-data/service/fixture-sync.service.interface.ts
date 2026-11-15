import type { JobOutcome } from '@/server/sync/lib/job.types'
import type { RequestBudget } from '@/server/sync/lib/request-budget'

export interface IFixtureSyncService {
    syncFixtures(seasons: number[], budget: RequestBudget): Promise<JobOutcome>
}

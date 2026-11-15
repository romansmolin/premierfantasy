import type { JobOutcome } from './lib/job.types'
import type { RequestBudget } from './lib/request-budget'
import type { SyncContainer } from './sync.container'

export type JobFn = () => Promise<JobOutcome>

/** Jobs that can be run alone, in the order `full` runs them. */
export function buildJobs(_container: SyncContainer, _budget: RequestBudget): Record<string, JobFn> {
    return {}
}

export const SHORT_JOBS = ['fixtures', 'match-stats', 'fpl-fixtures', 'fpl-points']
export const FULL_JOBS = ['fpl-bootstrap', ...SHORT_JOBS]

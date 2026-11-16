import { SEASON } from '@/shared/config/league'

import type { JobOutcome } from './lib/job.types'
import type { RequestBudget } from './lib/request-budget'
import type { SyncContainer } from './sync.container'

export type JobFn = () => Promise<JobOutcome>

/** Current season first, then the previous one. */
const SEASONS = [SEASON, SEASON - 1]

export function buildJobs(container: SyncContainer, budget: RequestBudget): Record<string, JobFn> {
    return {
        fixtures: () => container.fixtureSyncService.syncFixtures(SEASONS, budget),
        'match-stats': () => container.matchStatsSyncService.syncMatchStats(SEASONS, budget),
        'fpl-bootstrap': () => container.fplSyncService.syncBootstrap(SEASON),
        'fpl-fixtures': () => container.fplSyncService.linkFixtures(SEASON),
        'fpl-points': () => container.fplSyncService.syncPoints(),
        'fpl-matches': () => container.fplSyncService.syncPlayerMatches(undefined, () => budget.timeUp()),
        forecast: () => container.forecastService.run(),
    }
}

export const SHORT_JOBS = ['fixtures', 'match-stats', 'fpl-fixtures', 'fpl-points', 'fpl-matches', 'forecast']
export const FULL_JOBS = ['fpl-bootstrap', ...SHORT_JOBS]

import { createFplClient } from '@/server/fpl/lib/fpl-client'
import { FplRepository } from '@/server/fpl/repository/fpl.repository'
import { FplSyncService } from '@/server/fpl/service/fpl-sync.service'
import { MatchDataRepository } from '@/server/match-data/repository/match-data.repository'
import { FixtureSyncService } from '@/server/match-data/service/fixture-sync.service'
import { MatchStatsSyncService } from '@/server/match-data/service/match-stats-sync.service'
import { ForecastDataRepository } from '@/server/prediction/repository/forecast-data.repository'
import { ForecastRepository } from '@/server/prediction/repository/forecast.repository'
import { ForecastService } from '@/server/prediction/service/forecast.service'

import { createApiFootballHttpFromEnv } from '@/shared/api/api-football-http'

import { SyncRunRepository } from './repository/sync-run.repository'

/** 4 requests per second stays under the plan's 300 per minute. */
const API_MIN_INTERVAL_MS = 250

/**
 * Composition root for sync jobs (scripts and GitHub Actions). Second root next to
 * `src/shared/lib/container.ts`: it wires job services only, so it must not import controllers,
 * `next/*`, `server-only` or `@/shared/lib/http`.
 */
export function createSyncContainer() {
    const syncRunRepository = new SyncRunRepository()
    const matchDataRepository = new MatchDataRepository()

    // Built on first use so a job that does not call API-Football does not need its env vars.
    let apiFootballHttp: ReturnType<typeof createApiFootballHttpFromEnv> | null = null
    const apiFootball = {
        get: <T>(endpoint: string, params?: Record<string, string | number>) => {
            apiFootballHttp ??= createApiFootballHttpFromEnv({ minIntervalMs: API_MIN_INTERVAL_MS })

            return apiFootballHttp.get<T>(endpoint, params)
        },
    }

    const fixtureSyncService = new FixtureSyncService(matchDataRepository, apiFootball)
    const matchStatsSyncService = new MatchStatsSyncService(matchDataRepository, apiFootball)
    const fplSyncService = new FplSyncService(new FplRepository(), createFplClient())
    const forecastService = new ForecastService(new ForecastDataRepository(), new ForecastRepository())

    return {
        syncRunRepository,
        matchDataRepository,
        apiFootball,
        fixtureSyncService,
        matchStatsSyncService,
        fplSyncService,
        forecastService,
    }
}

export type SyncContainer = ReturnType<typeof createSyncContainer>

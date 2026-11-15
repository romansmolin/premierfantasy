import { MatchDataRepository } from '@/server/match-data/repository/match-data.repository'
import { FixtureSyncService } from '@/server/match-data/service/fixture-sync.service'

import { createApiFootballHttpFromEnv } from '@/shared/api/api-football-http'

import { SyncRunRepository } from './repository/sync-run.repository'

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
            apiFootballHttp ??= createApiFootballHttpFromEnv()

            return apiFootballHttp.get<T>(endpoint, params)
        },
    }

    const fixtureSyncService = new FixtureSyncService(matchDataRepository, apiFootball)

    return { syncRunRepository, matchDataRepository, apiFootball, fixtureSyncService }
}

export type SyncContainer = ReturnType<typeof createSyncContainer>

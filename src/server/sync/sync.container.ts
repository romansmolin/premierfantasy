import { SyncRunRepository } from './repository/sync-run.repository'

/**
 * Composition root for sync jobs (scripts and GitHub Actions). Second root next to
 * `src/shared/lib/container.ts`: it wires job services only, so it must not import controllers,
 * `next/*`, `server-only` or `@/shared/lib/http`.
 */
export function createSyncContainer() {
    const syncRunRepository = new SyncRunRepository()

    return { syncRunRepository }
}

export type SyncContainer = ReturnType<typeof createSyncContainer>

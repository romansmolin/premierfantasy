import type { JobOutcome } from '@/server/sync/lib/job.types'

export interface IFplSyncService {
    /** Events, squad rules, team ids, player matches and prices. Writes nothing when the answer looks wrong. */
    syncBootstrap(seasonYear: number): Promise<JobOutcome>
    /** Links our fixtures to FPL fixtures and events. */
    linkFixtures(seasonYear: number): Promise<JobOutcome>
    /** Actual points of finished events (and the latest two events again, FPL corrects points after the fact). */
    syncPoints(): Promise<JobOutcome>
    /**
     * Per-fixture xG, xA and starts for players that played; resumes over several runs (at most maxPlayers per run).
     * Stops taking players once shouldStop() is true (time budget): status PARTIAL, stats.stoppedEarly 1.
     */
    syncPlayerMatches(maxPlayers?: number, shouldStop?: () => boolean): Promise<JobOutcome>
}

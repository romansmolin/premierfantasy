import type { JobOutcome, JobResult } from '../lib/job.types'
import type { ISyncRunRepository } from '../repository/sync-run.repository.interface'

/** Runs one job, records it in `SyncRun`, and never throws: a failure comes back as `FAILED`. */
export async function runJob(
    name: string,
    repo: ISyncRunRepository,
    work: () => Promise<JobOutcome>,
): Promise<JobResult> {
    const runId = await repo.start(name)
    let result: JobResult

    try {
        const outcome = await work()

        result = { status: outcome.status, stats: outcome.stats }
    } catch (error) {
        result = {
            status: 'FAILED',
            stats: {},
            error: error instanceof Error ? error.message : String(error),
        }
    }

    try {
        await repo.finish(runId, result.status, result.stats, result.error)
    } catch (error) {
        console.error(`Could not record sync run ${runId}`, error)
    }

    return result
}

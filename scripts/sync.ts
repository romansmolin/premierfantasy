/**
 * Run data sync jobs.
 *
 * Usage:
 *   npm run sync -- <job|short|full> [--max-requests N]
 *
 * Needs STORAGE_DATABASE_URL, FOOTBAL_API_BASE_URL and FOOTBAL_API_KEY (loaded from .env by `npm run sync`).
 * Exit code: 0 ok or partial, 1 a job failed, 2 bad usage.
 */
import { parseSyncArgs, runSyncCli } from '../src/server/sync/cli'
import { buildJobs, FULL_JOBS, SHORT_JOBS } from '../src/server/sync/jobs'
import { RequestBudget } from '../src/server/sync/lib/request-budget'
import { createSyncContainer } from '../src/server/sync/sync.container'

async function main() {
    let args: ReturnType<typeof parseSyncArgs>

    try {
        args = parseSyncArgs(process.argv.slice(2))
    } catch (error) {
        process.stdout.write(`${error instanceof Error ? error.message : error}\n`)
        process.exit(2)
    }

    const container = createSyncContainer()
    const budget = new RequestBudget(args.maxRequests)
    const code = await runSyncCli(args.names, {
        jobs: buildJobs(container, budget),
        groups: { short: SHORT_JOBS, full: FULL_JOBS },
        syncRunRepository: container.syncRunRepository,
        write: (line) => process.stdout.write(`${line}\n`),
    })

    process.exit(code)
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
})

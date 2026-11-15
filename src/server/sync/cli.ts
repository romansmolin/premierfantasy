import { runJob } from './service/job-runner'

import type { JobFn } from './jobs'
import type { ISyncRunRepository } from './repository/sync-run.repository.interface'

export interface CliDeps {
    jobs: Record<string, JobFn>
    groups: Record<string, string[]>
    syncRunRepository: ISyncRunRepository
    write: (line: string) => void
}

/** Runs the named job or group; returns the process exit code (0 ok/partial, 1 a job failed, 2 bad usage). */
export async function runSyncCli(names: string[], deps: CliDeps): Promise<number> {
    const requested = names[0]
    const known = [...Object.keys(deps.groups), ...Object.keys(deps.jobs)]

    if (!requested || !known.includes(requested)) {
        deps.write(`Usage: npm run sync -- <${known.join('|')}> [--max-requests N]`)

        return 2
    }

    const toRun = deps.groups[requested] ?? [requested]
    let failed = false

    for (const name of toRun) {
        const job = deps.jobs[name]

        if (!job) {
            deps.write(`${name}: not available`)
            failed = true

            continue
        }

        const result = await runJob(name, deps.syncRunRepository, job)

        deps.write(
            `${name}: ${result.status} ${JSON.stringify(result.stats)}${result.error ? ` — ${result.error}` : ''}`,
        )

        if (result.status === 'FAILED') failed = true
    }

    return failed ? 1 : 0
}

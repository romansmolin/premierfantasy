import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

import { assertCron } from '@/shared/lib/cron-auth'
import { withController } from '@/shared/lib/http'

import { FULL_JOBS, PROBABILITY_JOBS } from '../jobs'
import { RequestBudget } from '../lib/request-budget'
import { runJob } from '../service/job-runner'

import type { JobFn } from '../jobs'
import type { JobResult } from '../lib/job.types'
import type { ISyncRunRepository } from '../repository/sync-run.repository.interface'
import type { NextRequest } from 'next/server'

/** Stay under the serverless function limit (maxDuration 60 s on the route). */
const MAX_MILLIS = 45_000
/** The probability cron has 300 s: leave about 60 s after the `fpl-matches` budget for `probability`. */
const PROBABILITY_MAX_MILLIS = 240_000
const MAX_REQUESTS = 300

export class SyncCronController {
    private readonly syncRunRepository: ISyncRunRepository
    private readonly buildJobs: (budget: RequestBudget) => Record<string, JobFn>

    constructor(
        syncRunRepository: ISyncRunRepository,
        buildJobs: (budget: RequestBudget) => Record<string, JobFn>,
    ) {
        this.syncRunRepository = syncRunRepository
        this.buildJobs = buildJobs
    }

    /** Runs the full sync. Any failed job makes the response 500 so Vercel shows the cron as failed. */
    run = withController((req) => this.runJobs(req, FULL_JOBS, MAX_MILLIS))

    /** Runs `fpl-matches` then `probability` on their own cron with a longer limit (maxDuration 300 s on the route). */
    runProbability = withController((req) => this.runJobs(req, PROBABILITY_JOBS, PROBABILITY_MAX_MILLIS))

    private async runJobs(req: NextRequest, names: string[], maxMillis: number) {
        assertCron(req)

        const jobs = this.buildJobs(new RequestBudget(MAX_REQUESTS, undefined, { maxMillis }))
        const results: Record<string, JobResult> = {}

        for (const name of names) {
            results[name] = await runJob(name, this.syncRunRepository, jobs[name])
        }

        // Public stats pages are cached for an hour; new data and a possibly switched-off forecast must show at once.
        revalidateTag('stats', { expire: 0 })

        const failed = Object.values(results).some((result) => result.status === 'FAILED')

        return NextResponse.json(results, { status: failed ? 500 : 200 })
    }
}

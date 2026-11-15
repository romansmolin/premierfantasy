import { NextResponse } from 'next/server'

import { assertCron } from '@/shared/lib/cron-auth'
import { withController } from '@/shared/lib/http'

import { FULL_JOBS } from '../jobs'
import { RequestBudget } from '../lib/request-budget'
import { runJob } from '../service/job-runner'

import type { JobFn } from '../jobs'
import type { JobResult } from '../lib/job.types'
import type { ISyncRunRepository } from '../repository/sync-run.repository.interface'

/** Stay under the serverless function limit (maxDuration 60 s on the route). */
const MAX_MILLIS = 45_000
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
    run = withController(async (req) => {
        assertCron(req)

        const jobs = this.buildJobs(new RequestBudget(MAX_REQUESTS, undefined, { maxMillis: MAX_MILLIS }))
        const results: Record<string, JobResult> = {}

        for (const name of FULL_JOBS) {
            results[name] = await runJob(name, this.syncRunRepository, jobs[name])
        }

        const failed = Object.values(results).some((result) => result.status === 'FAILED')

        return NextResponse.json(results, { status: failed ? 500 : 200 })
    })
}

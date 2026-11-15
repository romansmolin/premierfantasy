import { prisma } from '@/shared/lib/prisma'

import type { ISyncRunRepository } from './sync-run.repository.interface'
import type { JobStatus } from '../lib/job.types'

export class SyncRunRepository implements ISyncRunRepository {
    async start(job: string): Promise<string> {
        const run = await prisma.syncRun.create({ data: { job, status: 'RUNNING' }, select: { id: true } })

        return run.id
    }

    async finish(
        id: string,
        status: JobStatus,
        stats: Record<string, number>,
        error?: string,
    ): Promise<void> {
        await prisma.syncRun.update({
            where: { id },
            data: { status, stats, error: error ?? null, finishedAt: new Date() },
        })
    }
}

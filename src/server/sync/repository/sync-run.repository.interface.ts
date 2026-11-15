import type { JobStatus } from '../lib/job.types'

export interface ISyncRunRepository {
    start(job: string): Promise<string>
    finish(id: string, status: JobStatus, stats: Record<string, number>, error?: string): Promise<void>
}

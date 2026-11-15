export type JobStatus = 'OK' | 'PARTIAL' | 'FAILED'

/** What a job returns when it did not fail. PARTIAL means it stopped early (budget or quota), not an error. */
export interface JobOutcome {
    status: 'OK' | 'PARTIAL'
    stats: Record<string, number>
}

export interface JobResult {
    status: JobStatus
    stats: Record<string, number>
    error?: string
}

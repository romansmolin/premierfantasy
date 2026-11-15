import type { AiFeature } from '@/entities/ai/model/ai-pricing'

export interface IAiReportRepository {
    /** Newest saved payload created at or after `notBefore` (any age when `null`), or `null`. */
    findLatest(
        userId: string,
        kind: AiFeature,
        subjectKey: string,
        notBefore: Date | null,
    ): Promise<unknown | null>
    save(userId: string, kind: AiFeature, subjectKey: string, payload: unknown): Promise<void>
}

import type { Prisma } from '../../../../generated/prisma/client'

import type { AiFeature } from '@/entities/ai/model/ai-pricing'

import { prisma } from '@/shared/lib/prisma'

import type { IAiReportRepository } from './ai-report.repository.interface'

export class AiReportRepository implements IAiReportRepository {
    async findLatest(
        userId: string,
        kind: AiFeature,
        subjectKey: string,
        notBefore: Date | null,
    ): Promise<unknown | null> {
        const report = await prisma.aiReport.findFirst({
            where: { userId, kind, subjectKey, ...(notBefore ? { createdAt: { gte: notBefore } } : {}) },
            orderBy: { createdAt: 'desc' },
            select: { payload: true },
        })

        return report?.payload ?? null
    }

    async save(userId: string, kind: AiFeature, subjectKey: string, payload: unknown): Promise<void> {
        await prisma.aiReport.create({
            data: { userId, kind, subjectKey, payload: payload as Prisma.InputJsonValue },
        })
    }
}

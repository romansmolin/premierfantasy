import { chunk } from '@/server/sync/lib/chunk'

import { prisma } from '@/shared/lib/prisma'

import type { IForecastRepository, PredictionRow } from './forecast.repository.interface'
import type { Evaluation } from '../lib/evaluation'

const INSERT_CHUNK = 200

export class ForecastRepository implements IForecastRepository {
    async saveEvaluation(e: Evaluation): Promise<void> {
        await prisma.modelEvaluation.create({
            data: {
                modelVersion: e.modelVersion,
                eventsEvaluated: e.eventsEvaluated,
                playerEvents: e.playerEvents,
                mae: e.mae,
                baselineMae: e.baselineMae,
                rankCorr: e.rankCorr,
                baselineRankCorr: e.baselineRankCorr,
                passed: e.passed,
                details: { ...e.details, reasons: e.reasons },
            },
        })
    }

    async replacePredictions(fplEvent: number, modelVersion: string, rows: PredictionRow[]): Promise<void> {
        await prisma.$transaction(
            [
                prisma.prediction.deleteMany({ where: { fplEvent, modelVersion } }),
                ...chunk(rows, INSERT_CHUNK).map((group) =>
                    prisma.prediction.createMany({
                        data: group.map((row) => ({ fplEvent, modelVersion, ...row })),
                    }),
                ),
            ],
            { timeout: 30_000 } as never,
        )
    }

    async findLatestEvaluation(modelVersion: string): Promise<(Evaluation & { createdAt: Date }) | null> {
        const row = await prisma.modelEvaluation.findFirst({
            where: { modelVersion },
            orderBy: { createdAt: 'desc' },
        })

        if (!row) return null

        const details = row.details as Record<string, unknown>

        return {
            modelVersion: row.modelVersion,
            createdAt: row.createdAt,
            eventsEvaluated: row.eventsEvaluated,
            playerEvents: row.playerEvents,
            mae: row.mae,
            baselineMae: row.baselineMae,
            rankCorr: row.rankCorr,
            baselineRankCorr: row.baselineRankCorr,
            passed: row.passed,
            reasons: Array.isArray(details.reasons) ? (details.reasons as string[]) : [],
            details,
        }
    }

    async findNextEventId(): Promise<number | null> {
        const next = await prisma.fplEvent.findFirst({ where: { isNext: true }, select: { id: true } })

        if (next) return next.id

        const open = await prisma.fplEvent.findFirst({
            where: { finished: false },
            orderBy: { id: 'asc' },
            select: { id: true },
        })

        return open?.id ?? null
    }
}

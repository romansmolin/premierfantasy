import { chunk } from '@/server/sync/lib/chunk'

import { prisma } from '@/shared/lib/prisma'

import { MODEL_VERSION_V2 } from '../lib/v2/params'

import type {
    FixtureProbabilityRow,
    IProbabilityRepository,
    PlayerMatchProbability,
} from './probability.repository.interface'
import type { Calibration } from '../lib/evaluation'
import type { GateResult, ProbabilityEvaluation } from '../lib/v2/evaluation'
import type { PointsMean } from '../lib/v2/points-mean'

const INSERT_CHUNK = 200

interface StoredDetails {
    gates: GateResult[]
    pointsMean: PointsMean
    calibration: ProbabilityEvaluation['calibration']
}

export class ProbabilityRepository implements IProbabilityRepository {
    async saveEvaluation(e: ProbabilityEvaluation): Promise<void> {
        const details: StoredDetails = {
            gates: e.gates,
            pointsMean: e.pointsMean,
            calibration: e.calibration,
        }

        await prisma.modelEvaluation.create({
            data: {
                modelVersion: MODEL_VERSION_V2,
                eventsEvaluated: e.eventsEvaluated,
                playerEvents: e.pointsMean.n,
                mae: e.pointsMean.maeV2,
                // v1 is the benchmark of the points mean.
                baselineMae: e.pointsMean.maeV1,
                rankCorr: e.pointsMean.rankCorrV2,
                baselineRankCorr: e.pointsMean.rankCorrV1,
                passed: e.pointsMean.passed,
                // Through JSON so NaN (an empty backtest) is stored as null instead of failing the insert.
                details: JSON.parse(JSON.stringify(details)),
            },
        })
    }

    async findLatestEvaluation(): Promise<(ProbabilityEvaluation & { createdAt: Date }) | null> {
        const row = await prisma.modelEvaluation.findFirst({
            where: { modelVersion: MODEL_VERSION_V2 },
            orderBy: { createdAt: 'desc' },
        })

        if (!row) return null

        const details = row.details as unknown as StoredDetails

        return {
            modelVersion: row.modelVersion,
            createdAt: row.createdAt,
            eventsEvaluated: row.eventsEvaluated,
            gates: details.gates,
            pointsMean: details.pointsMean,
            calibration: details.calibration as Record<keyof typeof details.calibration, Calibration>,
        }
    }

    async replaceMatchProbabilities(rows: PlayerMatchProbability[]): Promise<void> {
        await prisma.$transaction(
            [
                prisma.matchProbability.deleteMany({ where: { modelVersion: MODEL_VERSION_V2 } }),
                ...chunk(rows, INSERT_CHUNK).map((group) =>
                    prisma.matchProbability.createMany({
                        data: group.map((row) => ({ modelVersion: MODEL_VERSION_V2, ...row })),
                    }),
                ),
            ],
            { timeout: 30_000 } as never,
        )
    }

    async replaceFixtureProbabilities(rows: FixtureProbabilityRow[]): Promise<void> {
        await prisma.$transaction(
            [
                prisma.fixtureProbability.deleteMany({ where: { modelVersion: MODEL_VERSION_V2 } }),
                ...chunk(rows, INSERT_CHUNK).map((group) =>
                    prisma.fixtureProbability.createMany({
                        data: group.map((row) => ({ modelVersion: MODEL_VERSION_V2, ...row })),
                    }),
                ),
            ],
            { timeout: 30_000 } as never,
        )
    }

    async findMatchProbabilities(
        playerId?: string,
    ): Promise<(PlayerMatchProbability & { createdAt: Date })[]> {
        const rows = await prisma.matchProbability.findMany({
            where: { modelVersion: MODEL_VERSION_V2, ...(playerId ? { playerId } : {}) },
            orderBy: [{ playerId: 'asc' }, { horizon: 'asc' }],
        })

        return rows.map((r) => ({
            fixtureId: r.fixtureId,
            playerId: r.playerId,
            horizon: r.horizon,
            pGoal: r.pGoal,
            pAssist: r.pAssist,
            pStart: r.pStart,
            expectedMinutes: r.expectedMinutes,
            expectedPoints: r.expectedPoints,
            pointsBuckets: r.pointsBuckets as number[],
            createdAt: r.createdAt,
        }))
    }

    async findFixtureProbabilities(fixtureIds?: string[]): Promise<FixtureProbabilityRow[]> {
        const rows = await prisma.fixtureProbability.findMany({
            where: {
                modelVersion: MODEL_VERSION_V2,
                ...(fixtureIds ? { fixtureId: { in: fixtureIds } } : {}),
            },
        })

        return rows.map((r) => ({
            fixtureId: r.fixtureId,
            pHome: r.pHome,
            pDraw: r.pDraw,
            pAway: r.pAway,
            xgHome: r.xgHome,
            xgAway: r.xgAway,
            leagueGoals: r.leagueGoals,
        }))
    }
}

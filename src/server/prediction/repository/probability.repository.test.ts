import { describe, expect, it, vi } from 'vitest'

import { ProbabilityRepository } from './probability.repository'

import type { ProbabilityEvaluation } from '../lib/v2/evaluation'

const create = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@/shared/lib/prisma', () => ({ prisma: { modelEvaluation: { create } } }))

describe('ProbabilityRepository.saveEvaluation', () => {
    it('writes no NaN to the scalar columns for an empty backtest', async () => {
        const e: ProbabilityEvaluation = {
            modelVersion: 'ewma-poisson-v2',
            eventsEvaluated: 0,
            gates: [],
            pointsMean: {
                passed: false,
                maeV2: NaN,
                maeV1: NaN,
                rankCorrV2: NaN,
                rankCorrV1: NaN,
                n: 0,
                reasons: [],
            },
            calibration: {
                GK: { intercept: 0, slope: 1 },
                DEF: { intercept: 0, slope: 1 },
                MID: { intercept: 0, slope: 1 },
                FWD: { intercept: 0, slope: 1 },
            },
        }

        await new ProbabilityRepository().saveEvaluation(e)

        const { data } = create.mock.calls[0][0]

        expect([data.mae, data.baselineMae, data.rankCorr, data.baselineRankCorr]).toEqual([0, 0, 0, 0])
    })
})

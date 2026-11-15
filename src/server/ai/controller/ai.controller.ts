import { z } from 'zod'

import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { parseJson, withController } from '@/shared/lib/http'

import type { IAIInsightsService } from '../service/ai-insights.service.interface'

const playerAnalysisBodySchema = z.object({
    playerId: z.number().int().positive(),
})

const matchPredictionBodySchema = z.object({
    fixtureId: z.number().int().positive(),
})

export class AIController {
    private readonly aiInsightsService: IAIInsightsService

    constructor(aiInsightsService: IAIInsightsService) {
        this.aiInsightsService = aiInsightsService
    }

    getPlayerAnalysis = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { playerId } = await parseJson(req, playerAnalysisBodySchema)

        return this.aiInsightsService.getPlayerAnalysis(userId, playerId)
    })

    getMatchPrediction = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { fixtureId } = await parseJson(req, matchPredictionBodySchema)

        return this.aiInsightsService.getMatchPrediction(userId, fixtureId)
    })
}

import { z } from 'zod'

import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { parseQuery, withController } from '@/shared/lib/http'

import type { IAIInsightsService } from '../service/ai-insights.service.interface'

const playerAnalysisQuerySchema = z.object({
    playerId: z.coerce.number().int().positive(),
})

const matchPredictionQuerySchema = z.object({
    fixtureId: z.coerce.number().int().positive(),
})

export class AIController {
    private readonly aiInsightsService: IAIInsightsService

    constructor(aiInsightsService: IAIInsightsService) {
        this.aiInsightsService = aiInsightsService
    }

    getPlayerAnalysis = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { playerId } = parseQuery(req, playerAnalysisQuerySchema)

        return this.aiInsightsService.getPlayerAnalysis(userId, playerId)
    })

    getMatchPrediction = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { fixtureId } = parseQuery(req, matchPredictionQuerySchema)

        return this.aiInsightsService.getMatchPrediction(userId, fixtureId)
    })
}

import { z } from 'zod'

import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { parseQuery, withController } from '@/shared/lib/http'

import type { AITransferService } from '../service/ai-transfer.service'

const playerAnalysisQuerySchema = z.object({
    playerId: z.coerce.number().int().positive(),
})

const matchPredictionQuerySchema = z.object({
    fixtureId: z.coerce.number().int().positive(),
})

const transferSuggestionsQuerySchema = z.object({
    fantasyTeamId: z.string().min(1),
})

export class AIController {
    private readonly aiTransferService: AITransferService

    constructor(aiTransferService: AITransferService) {
        this.aiTransferService = aiTransferService
    }

    getPlayerAnalysis = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { playerId } = parseQuery(req, playerAnalysisQuerySchema)

        return this.aiTransferService.analyzePlayer(playerId)
    })

    getMatchPrediction = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { fixtureId } = parseQuery(req, matchPredictionQuerySchema)

        return this.aiTransferService.predictMatch(fixtureId)
    })

    getTransferSuggestions = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { fantasyTeamId } = parseQuery(req, transferSuggestionsQuerySchema)

        return this.aiTransferService.analyzeSquad(fantasyTeamId)
    })
}

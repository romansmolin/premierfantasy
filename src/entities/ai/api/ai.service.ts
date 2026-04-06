import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { AITransferAnalysis, MatchPrediction, PlayerAnalysis } from '../model/ai.types'

export const aiService = {
    async getTransferSuggestions(fantasyTeamId: string): Promise<AITransferAnalysis> {
        try {
            return await httpClient.get<AITransferAnalysis>(
                `/api/ai/transfer-suggestions?fantasyTeamId=${fantasyTeamId}`,
            )
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to get AI suggestions')
        }
    },

    async getPlayerAnalysis(playerExternalId: number): Promise<PlayerAnalysis> {
        try {
            return await httpClient.get<PlayerAnalysis>(
                `/api/ai/player-analysis?playerId=${playerExternalId}`,
            )
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to get player analysis')
        }
    },

    async getMatchPrediction(fixtureId: number): Promise<MatchPrediction> {
        try {
            return await httpClient.get<MatchPrediction>(`/api/ai/match-prediction?fixtureId=${fixtureId}`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to get match prediction')
        }
    },
}

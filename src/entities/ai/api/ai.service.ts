import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { MatchPrediction, PlayerAnalysis } from '../model/ai.types'

export const aiService = {
    async getPlayerAnalysis(playerExternalId: number): Promise<PlayerAnalysis> {
        try {
            return await httpClient.post<PlayerAnalysis>('/api/ai/player-analysis', {
                playerId: playerExternalId,
            })
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to get player analysis')
        }
    },

    async getMatchPrediction(fixtureId: number): Promise<MatchPrediction> {
        try {
            return await httpClient.post<MatchPrediction>('/api/ai/match-prediction', { fixtureId })
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to get match prediction')
        }
    },
}

import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { ICompetition, ICompetitionState, ILeaderboard } from '../model/competition.types'

const BASE_URL = '/api/competitions'

export const competitionService = {
    async getAll(): Promise<ICompetition[]> {
        try {
            return await httpClient.get<ICompetition[]>(BASE_URL)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch competitions')
        }
    },

    async getById(id: string): Promise<ICompetition> {
        try {
            return await httpClient.get<ICompetition>(`${BASE_URL}/${id}`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, `Failed to fetch competition ${id}`)
        }
    },

    async getLeaderboard(competitionId: string): Promise<ILeaderboard> {
        try {
            return await httpClient.get<ILeaderboard>(`${BASE_URL}/${competitionId}/leaderboard`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch leaderboard')
        }
    },

    async getCompetitionState(): Promise<ICompetitionState> {
        try {
            return await httpClient.get<ICompetitionState>(`${BASE_URL}/state`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch competition state')
        }
    },
}

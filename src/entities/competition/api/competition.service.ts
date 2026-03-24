import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { ICompetition } from '../model/competition.types'

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
}

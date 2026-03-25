import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { IGameweek } from '../model/gameweek.types'

const BASE_URL = '/api/gameweeks'

export const gameweekService = {
    async getAll(): Promise<IGameweek[]> {
        try {
            return await httpClient.get<IGameweek[]>(BASE_URL)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch gameweeks')
        }
    },

    async getActive(): Promise<IGameweek | null> {
        try {
            return await httpClient.get<IGameweek | null>(`${BASE_URL}/active`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch active gameweek')
        }
    },
}

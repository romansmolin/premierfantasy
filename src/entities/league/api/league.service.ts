import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { LeagueBrowserItem } from '../model/league.types'

const BASE_URL = '/api/leagues'

export const leagueService = {
    async getBrowser(): Promise<LeagueBrowserItem[]> {
        try {
            return await httpClient.get<LeagueBrowserItem[]>(`${BASE_URL}/browser`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to load leagues')
        }
    },
}

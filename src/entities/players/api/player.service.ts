import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { IPlayerDetails } from '../model/player-details.types'

function getCurrentSeason(): number {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    return month >= 8 ? year : year - 1
}

export const playerService = {
    async getPlayerDetails(playerId: number, season = getCurrentSeason()): Promise<IPlayerDetails> {
        try {
            return await httpClient.get<IPlayerDetails>(`/api/players/${playerId}?season=${season}`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch player details')
        }
    },
}

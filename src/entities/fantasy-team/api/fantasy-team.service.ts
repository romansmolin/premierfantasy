import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { IFantasyTeam } from '../model/fantasy-team.types'

const BASE_URL = '/api/fantasy-teams'

export const fantasyTeamService = {
    async getByUserId(userId: string): Promise<IFantasyTeam[]> {
        try {
            return await httpClient.get<IFantasyTeam[]>(`${BASE_URL}/user/${userId}`)
        } catch (error) {
            throw ApiError.isApiError(error)
                ? error
                : new ApiError(500, `Failed to fetch fantasy teams for user ${userId}`)
        }
    },
}

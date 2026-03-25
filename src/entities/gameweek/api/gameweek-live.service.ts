import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { LiveFixtureResult, LiveTeamPoints } from '../model/gameweek-live.types'

export const gameweekLiveService = {
    async getLivePoints(gameweekId: string, fantasyTeamId: string): Promise<LiveTeamPoints> {
        try {
            return await httpClient.get<LiveTeamPoints>(
                `/api/scoring/live?gameweekId=${gameweekId}&fantasyTeamId=${fantasyTeamId}`,
            )
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch live points')
        }
    },

    async getLiveFixtures(gameweekNumber: number): Promise<LiveFixtureResult[]> {
        try {
            return await httpClient.get<LiveFixtureResult[]>(
                `/api/scoring/live/fixtures?gameweekNumber=${gameweekNumber}`,
            )
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch live fixtures')
        }
    },
}

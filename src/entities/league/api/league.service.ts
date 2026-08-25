import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { IJoinLeagueResult, ILeagueParticipant, IMyLeague } from '../model/league-membership.types'
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

    async getMine(): Promise<IMyLeague[]> {
        try {
            return await httpClient.get<IMyLeague[]>(`${BASE_URL}/mine`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to load your leagues')
        }
    },

    async join(leagueId: string): Promise<IJoinLeagueResult> {
        try {
            return await httpClient.post<IJoinLeagueResult>(`${BASE_URL}/${leagueId}/join`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to join league')
        }
    },

    async getParticipants(leagueSeasonId: string): Promise<ILeagueParticipant[]> {
        try {
            return await httpClient.get<ILeagueParticipant[]>(
                `${BASE_URL}/seasons/${leagueSeasonId}/participants`,
            )
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to load participants')
        }
    },
}

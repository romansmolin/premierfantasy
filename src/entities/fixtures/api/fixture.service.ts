import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { IFixture, ILeagueNextFixtures } from '../model/fixture.types'

export const fixtureService = {
    async getUpcoming(count = 20, leagueExternalId?: number, season?: number): Promise<IFixture[]> {
        const params = new URLSearchParams({ count: String(count) })

        if (leagueExternalId) params.set('leagueId', String(leagueExternalId))

        if (season) params.set('season', String(season))

        try {
            return await httpClient.get<IFixture[]>(`/api/fixtures/upcoming?${params.toString()}`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch upcoming fixtures')
        }
    },

    /** Next fixtures for several leagues in one round trip. Season is per league. */
    async getNextForLeagues(
        leagues: { leagueExternalId: number; season: number }[],
        perLeague = 1,
    ): Promise<ILeagueNextFixtures[]> {
        if (leagues.length === 0) return []

        const params = new URLSearchParams({
            leagues: leagues.map((l) => `${l.leagueExternalId}:${l.season}`).join(','),
            perLeague: String(perLeague),
        })

        try {
            return await httpClient.get<ILeagueNextFixtures[]>(`/api/fixtures/next?${params.toString()}`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch next fixtures')
        }
    },
}

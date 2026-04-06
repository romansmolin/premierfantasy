import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { IFixture } from '../model/fixture.types'

export const fixtureService = {
    async getUpcoming(count = 20): Promise<IFixture[]> {
        try {
            return await httpClient.get<IFixture[]>(`/api/fixtures/upcoming?count=${count}`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch upcoming fixtures')
        }
    },
}

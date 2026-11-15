import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { FplMappingList } from '../model/fpl-mapping.types'

const URL = '/api/admin/fpl/mapping'

const auth = (secret: string) => ({ headers: { Authorization: `Bearer ${secret}` } })

/** The admin secret is passed per call and never stored. */
export const fplMappingService = {
    async list(secret: string): Promise<FplMappingList> {
        try {
            return await httpClient.get<FplMappingList>(URL, auth(secret))
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to load matches')
        }
    },

    async confirm(secret: string, fplId: number, playerId: string): Promise<void> {
        try {
            await httpClient.post(URL, { fplId, playerId }, auth(secret))
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to confirm the match')
        }
    },

    async reject(secret: string, fplId: number): Promise<void> {
        try {
            await httpClient.post(URL, { fplId, reject: true }, auth(secret))
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to reject the match')
        }
    },

    async replace(secret: string, fplId: number, playerId: string): Promise<void> {
        try {
            await httpClient.post(URL, { fplId, playerId, replace: true }, auth(secret))
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to replace the match')
        }
    },

    async unmap(secret: string, fplId: number): Promise<void> {
        try {
            await httpClient.post(URL, { fplId, unmap: true }, auth(secret))
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to remove the match')
        }
    },
}

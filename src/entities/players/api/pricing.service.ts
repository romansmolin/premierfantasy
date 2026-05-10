import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

export interface PriceRow {
    externalId: number
    currentPrice: number
}

export const pricingService = {
    async getBySeason(seasonYear: number): Promise<PriceRow[]> {
        try {
            return await httpClient.get<PriceRow[]>(`/api/pricing/${seasonYear}`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch prices')
        }
    },
}

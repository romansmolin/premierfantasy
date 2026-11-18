import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'
import type { CheckoutCustomer } from '@/shared/model/checkout-customer'

const URL = '/api/billing/profile'

interface ProfileResponse {
    profile: CheckoutCustomer | null
}

export const billingService = {
    async getProfile(): Promise<CheckoutCustomer | null> {
        try {
            return (await httpClient.get<ProfileResponse>(URL)).profile
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to load billing details')
        }
    },

    async saveProfile(customer: CheckoutCustomer): Promise<CheckoutCustomer | null> {
        try {
            return (await httpClient.put<ProfileResponse>(URL, customer)).profile
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to save billing details')
        }
    },
}

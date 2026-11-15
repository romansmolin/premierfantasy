import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'
import type { CheckoutCustomer } from '@/shared/model/checkout-customer'

import type { ICheckoutResponse, ICoinPack, IWalletData } from '../model/wallet.types'

const BASE_URL = '/api/wallet'

export const walletService = {
    async getWallet(): Promise<IWalletData> {
        try {
            return await httpClient.get<IWalletData>(BASE_URL)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch wallet')
        }
    },

    async createCheckout(coinAmount: number, customer: CheckoutCustomer): Promise<ICheckoutResponse> {
        try {
            return await httpClient.post<ICheckoutResponse>('/api/payments/checkout', {
                coinAmount,
                customer,
                withdrawalConsent: true,
            })
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to create checkout')
        }
    },

    /** Checkout for a free-chosen amount. Coins are decided by the server. */
    async createCustomCheckout(amountCents: number, customer: CheckoutCustomer): Promise<ICheckoutResponse> {
        try {
            return await httpClient.post<ICheckoutResponse>('/api/payments/checkout/custom', {
                amountCents,
                customer,
                withdrawalConsent: true,
            })
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to create checkout')
        }
    },

    async getCoinPacks(): Promise<ICoinPack[]> {
        try {
            return await httpClient.get<ICoinPack[]>('/api/wallet/packs')
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch Credit packs')
        }
    },
}

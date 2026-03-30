import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

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

    async purchaseCoins(amount: number): Promise<IWalletData> {
        try {
            return await httpClient.post<IWalletData>(`${BASE_URL}/purchase`, { amount })
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to purchase coins')
        }
    },

    async spendCoins(amount: number, feature: string): Promise<IWalletData> {
        try {
            return await httpClient.post<IWalletData>(`${BASE_URL}/spend`, { amount, feature })
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to spend coins')
        }
    },

    async createCheckout(coinAmount: number): Promise<ICheckoutResponse> {
        try {
            return await httpClient.post<ICheckoutResponse>('/api/payments/checkout', { coinAmount })
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to create checkout')
        }
    },

    async getCoinPacks(): Promise<ICoinPack[]> {
        try {
            return await httpClient.get<ICoinPack[]>('/api/wallet/packs')
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch coin packs')
        }
    },
}

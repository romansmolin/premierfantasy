import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { IWalletData } from '../model/wallet.types'

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
}

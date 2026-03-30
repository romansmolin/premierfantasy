'use client'

import useSWR from 'swr'

import { useSession } from '@/shared/lib/auth-client'

import { walletService } from '../api/wallet.service'

export const useWallet = () => {
    const { data: session, isPending: isSessionLoading } = useSession()

    const {
        data,
        error,
        isLoading: isWalletLoading,
        mutate,
    } = useSWR(session?.user?.id ? '/api/wallet' : null, () => walletService.getWallet())

    return {
        balance: data?.balance ?? 0,
        transactions: data?.transactions ?? [],
        isLoading: isSessionLoading || isWalletLoading,
        error,
        mutate,
    }
}

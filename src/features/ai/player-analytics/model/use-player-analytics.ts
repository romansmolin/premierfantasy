'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import useSWRMutation from 'swr/mutation'

import { aiService, AI_FEATURE_PRICES } from '@/entities/ai'
import type { PlayerAnalysis } from '@/entities/ai'
import { useWallet } from '@/entities/wallet'

import { ApiError } from '@/shared/api/api-error'

const AI_FEATURE_COST = AI_FEATURE_PRICES.PLAYER_ANALYSIS

export const usePlayerAnalytics = (playerExternalId: number | null) => {
    const [analysis, setAnalysis] = useState<PlayerAnalysis | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const { balance, mutate: mutateWallet } = useWallet()

    const { trigger, isMutating: isLoading } = useSWRMutation(
        playerExternalId ? `/api/ai/player-analysis?playerId=${playerExternalId}` : null,
        async () => aiService.getPlayerAnalysis(playerExternalId!),
    )

    const requestAnalysis = async () => {
        if (!playerExternalId) return

        try {
            const result = await trigger()

            if (result) {
                setAnalysis(result)
                setIsOpen(true)
            }
        } catch (error) {
            if (ApiError.isApiError(error) && error.status === 402) {
                toast.error(`Not enough credits. You need ${AI_FEATURE_COST} credits.`)
            } else {
                toast.error(error instanceof Error ? error.message : 'Analysis failed')
            }
        } finally {
            await mutateWallet()
        }
    }

    return {
        analysis,
        isOpen,
        isLoading,
        requestAnalysis,
        closeModal: () => setIsOpen(false),
        cost: AI_FEATURE_COST,
        canAfford: balance >= AI_FEATURE_COST,
    }
}

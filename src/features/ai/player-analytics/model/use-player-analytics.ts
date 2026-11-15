'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import useSWRMutation from 'swr/mutation'

import { aiService } from '@/entities/ai'
import type { PlayerAnalysis } from '@/entities/ai'
import { useWallet } from '@/entities/wallet'

const AI_FEATURE_COST = 300

export const usePlayerAnalytics = (playerExternalId: number | null) => {
    const [analysis, setAnalysis] = useState<PlayerAnalysis | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const { balance } = useWallet()

    const { trigger, isMutating: isLoading } = useSWRMutation(
        playerExternalId ? `/api/ai/player-analysis?playerId=${playerExternalId}` : null,
        async () => {
            return aiService.getPlayerAnalysis(playerExternalId!)
        },
    )

    const requestAnalysis = async () => {
        if (!playerExternalId) return

        if (balance < AI_FEATURE_COST) {
            toast.error(`Not enough coins. You need ${AI_FEATURE_COST} coins.`)

            return
        }

        try {
            const result = await trigger()

            if (result) {
                setAnalysis(result)
                setIsOpen(true)
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Analysis failed')
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

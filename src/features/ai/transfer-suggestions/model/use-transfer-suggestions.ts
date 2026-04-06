'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import useSWRMutation from 'swr/mutation'

import { aiService } from '@/entities/ai'
import { walletService, useWallet } from '@/entities/wallet'

import type { AITransferAnalysis } from '@/entities/ai'

const AI_FEATURE_COST = 500

export const useTransferSuggestions = (fantasyTeamId: string | undefined) => {
    const [analysis, setAnalysis] = useState<AITransferAnalysis | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const { balance, mutate: mutateWallet } = useWallet()

    const { trigger, isMutating: isLoading } = useSWRMutation(
        fantasyTeamId ? `/api/ai/transfer-suggestions?fantasyTeamId=${fantasyTeamId}` : null,
        async () => {
            // 1. Spend coins first
            await walletService.spendCoins(AI_FEATURE_COST, 'AI Transfer Suggestions')
            await mutateWallet()

            // 2. Fetch AI analysis
            const result = await aiService.getTransferSuggestions(fantasyTeamId!)

            return result
        },
    )

    const requestAnalysis = async () => {
        if (!fantasyTeamId) {
            toast.error('No team found')

            return
        }

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
            toast.error(error instanceof Error ? error.message : 'Failed to get suggestions')
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

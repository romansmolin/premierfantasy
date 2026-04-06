'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import useSWRMutation from 'swr/mutation'

import { aiService } from '@/entities/ai'
import type { MatchPrediction } from '@/entities/ai'
import { walletService, useWallet } from '@/entities/wallet'

const AI_FEATURE_COST = 300

export const useMatchPrediction = () => {
    const [prediction, setPrediction] = useState<MatchPrediction | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [activeFixtureId, setActiveFixtureId] = useState<number | null>(null)
    const { balance, mutate: mutateWallet } = useWallet()

    const { trigger, isMutating: isLoading } = useSWRMutation(
        activeFixtureId ? `/api/ai/match-prediction?fixtureId=${activeFixtureId}` : null,
        async () => {
            await walletService.spendCoins(AI_FEATURE_COST, 'Match Prediction Insights')
            await mutateWallet()

            return aiService.getMatchPrediction(activeFixtureId!)
        },
    )

    const requestPrediction = async (fixtureId: number) => {
        if (balance < AI_FEATURE_COST) {
            toast.error(`Not enough coins. You need ${AI_FEATURE_COST} coins.`)

            return
        }

        setActiveFixtureId(fixtureId)

        try {
            const result = await trigger()

            if (result) {
                setPrediction(result)
                setIsOpen(true)
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Prediction failed')
        }
    }

    return {
        prediction,
        isOpen,
        isLoading,
        activeFixtureId,
        requestPrediction,
        closeModal: () => {
            setIsOpen(false)
            setActiveFixtureId(null)
        },
        cost: AI_FEATURE_COST,
        canAfford: balance >= AI_FEATURE_COST,
    }
}

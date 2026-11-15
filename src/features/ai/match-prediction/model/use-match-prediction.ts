'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import useSWRMutation from 'swr/mutation'

import { aiService, AI_FEATURE_PRICES } from '@/entities/ai'
import type { MatchPrediction } from '@/entities/ai'
import { useWallet } from '@/entities/wallet'

import { ApiError } from '@/shared/api/api-error'

const AI_FEATURE_COST = AI_FEATURE_PRICES.MATCH_PREDICTION

export const useMatchPrediction = () => {
    const [prediction, setPrediction] = useState<MatchPrediction | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [activeFixtureId, setActiveFixtureId] = useState<number | null>(null)
    const { mutate: mutateWallet } = useWallet()

    // Static key, fixture id passed as the trigger arg: the key must exist on the very first click,
    // before the state update from setActiveFixtureId has re-rendered.
    const { trigger, isMutating: isLoading } = useSWRMutation(
        '/api/ai/match-prediction',
        async (_key: string, { arg }: { arg: number }) => aiService.getMatchPrediction(arg),
    )

    const requestPrediction = async (fixtureId: number) => {
        setActiveFixtureId(fixtureId)

        try {
            const result = await trigger(fixtureId)

            if (result) {
                setPrediction(result)
                setIsOpen(true)
            }
        } catch (error) {
            if (ApiError.isApiError(error) && error.status === 402) {
                toast.error(`Not enough credits. You need ${AI_FEATURE_COST} credits.`)
            } else {
                toast.error(error instanceof Error ? error.message : 'Prediction failed')
            }
        } finally {
            await mutateWallet()
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
    }
}

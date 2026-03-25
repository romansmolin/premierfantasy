'use client'

import useSWR from 'swr'

import { useSession } from '@/shared/lib/auth-client'

import { competitionService } from '../api/competition.service'

export const useCompetitionState = () => {
    const { data: session, isPending: isSessionLoading } = useSession()

    const {
        data,
        error,
        isLoading: isStateLoading,
        mutate,
    } = useSWR(session?.user?.id ? '/api/competitions/state' : null, () =>
        competitionService.getCompetitionState(),
    )

    return {
        state: data ?? null,
        isLoading: isSessionLoading || isStateLoading,
        error,
        mutate,
    }
}

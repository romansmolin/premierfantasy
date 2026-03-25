'use client'

import useSWR from 'swr'

import { competitionService } from '@/entities/competition'

export const useLeaderboard = (competitionId: string) => {
    const { data, error, isLoading } = useSWR(`/api/competitions/${competitionId}/leaderboard`, () =>
        competitionService.getLeaderboard(competitionId),
    )

    return { leaderboard: data, error, isLoading }
}

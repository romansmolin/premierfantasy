'use client'

import useSWR from 'swr'

import { gameweekLiveService } from '@/entities/gameweek/api/gameweek-live.service'

export const useLiveGameweek = (gameweekId: string, fantasyTeamId: string) => {
    const { data, error, isLoading } = useSWR(
        gameweekId && fantasyTeamId
            ? `/api/scoring/live?gameweekId=${gameweekId}&fantasyTeamId=${fantasyTeamId}`
            : null,
        () => gameweekLiveService.getLivePoints(gameweekId, fantasyTeamId),
        {
            refreshInterval: 60_000,
            revalidateOnFocus: true,
        },
    )

    return { livePoints: data, error, isLoading }
}

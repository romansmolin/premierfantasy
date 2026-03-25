'use client'

import useSWR from 'swr'

import { fantasyTeamService } from '@/entities/fantasy-team'

export const useGameweekDetail = (fantasyTeamId: string, gameweekNumber: number) => {
    const { data, error, isLoading } = useSWR(
        `/api/fantasy-teams/${fantasyTeamId}/gameweek/${gameweekNumber}`,
        () => fantasyTeamService.getSquadGameweekStats(fantasyTeamId, gameweekNumber),
    )

    return { players: data, error, isLoading }
}

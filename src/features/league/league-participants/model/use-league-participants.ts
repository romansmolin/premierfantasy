'use client'

import useSWR from 'swr'

import { leagueService } from '@/entities/league'
import type { ILeagueParticipant } from '@/entities/league'

export function useLeagueParticipants(leagueSeasonId: string | null | undefined) {
    const { data, error, isLoading } = useSWR<ILeagueParticipant[]>(
        leagueSeasonId ? `/api/leagues/seasons/${leagueSeasonId}/participants` : null,
        () => leagueService.getParticipants(leagueSeasonId!),
    )

    return { participants: data ?? [], isLoading, error }
}

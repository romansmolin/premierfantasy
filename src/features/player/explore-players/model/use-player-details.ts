'use client'

import useSWR from 'swr'

import { playerService } from '@/entities/players'

export const usePlayerDetails = (playerId: number | null) => {
    const { data, error, isLoading } = useSWR(playerId ? `/api/players/${playerId}` : null, () =>
        playerService.getPlayerDetails(playerId!),
    )

    return { player: data ?? null, error, isLoading }
}

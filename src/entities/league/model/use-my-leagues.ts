'use client'

import useSWR from 'swr'

import { useSession } from '@/shared/lib/auth-client'

import { leagueService } from '../api/league.service'

import type { IMyLeague } from './league-membership.types'

/** Cache key shared by every reader and writer of "My Leagues". */
export const MY_LEAGUES_KEY = '/api/leagues/mine'

export function useMyLeagues() {
    const { data: session, isPending } = useSession()
    const userId = session?.user?.id

    const { data, error, isLoading, mutate } = useSWR<IMyLeague[]>(
        userId ? MY_LEAGUES_KEY : null,
        () => leagueService.getMine(),
        { revalidateOnFocus: true },
    )

    return {
        myLeagues: data ?? [],
        isLoading: isPending || (!!userId && isLoading),
        isSignedIn: !!userId,
        error,
        refresh: mutate,
    }
}

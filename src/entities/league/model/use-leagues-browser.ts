import useSWR from 'swr'

import { leagueService } from '../api/league.service'

import type { LeagueBrowserItem } from './league.types'

export function useLeaguesBrowser() {
    const { data, error, isLoading, mutate } = useSWR<LeagueBrowserItem[]>(
        ['leagues', 'browser'],
        () => leagueService.getBrowser(),
        { revalidateOnFocus: false, dedupingInterval: 60 * 1000 },
    )

    return { leagues: data ?? [], isLoading, error, refresh: mutate }
}

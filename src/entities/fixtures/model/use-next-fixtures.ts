'use client'

import { useMemo } from 'react'
import useSWR from 'swr'

import { fixtureService } from '../api/fixture.service'

import type { IFixture, ILeagueNextFixtures } from './fixture.types'

export interface LeagueSeasonRef {
    leagueExternalId: number
    season: number
}

/**
 * Next fixture per league, fetched for every league in one request so a dashboard
 * of league cards costs a single round trip. Results are cached server-side too.
 */
export function useNextFixtures(leagues: LeagueSeasonRef[], perLeague = 1) {
    const refs = useMemo(() => {
        const seen = new Set<number>()

        return leagues
            .filter((league) => {
                if (league.leagueExternalId <= 0 || league.season <= 0) return false

                if (seen.has(league.leagueExternalId)) return false

                seen.add(league.leagueExternalId)

                return true
            })
            .sort((a, b) => a.leagueExternalId - b.leagueExternalId)
    }, [leagues])

    const cacheKey = refs.map((ref) => `${ref.leagueExternalId}:${ref.season}`).join(',')

    const { data, error, isLoading } = useSWR<ILeagueNextFixtures[]>(
        refs.length > 0 ? ['fixtures', 'next', cacheKey, perLeague] : null,
        () => fixtureService.getNextForLeagues(refs, perLeague),
        { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
    )

    const byLeague = useMemo(() => {
        const map = new Map<number, IFixture[]>()

        for (const row of data ?? []) map.set(row.leagueExternalId, row.fixtures)

        return map
    }, [data])

    return {
        fixturesByLeague: byLeague,
        nextFixtureFor: (leagueExternalId: number): IFixture | null =>
            byLeague.get(leagueExternalId)?.[0] ?? null,
        isLoading,
        error,
    }
}

'use client'

import { createContext, useContext, useMemo } from 'react'

import { LEAGUE_ID, SEASON } from '@/shared/config/league'

import type { ReactNode } from 'react'

export interface LeagueScope {
    /** API-Football league id the player pool should be drawn from. */
    leagueId: number
    seasonYear: number
}

const DEFAULT_SCOPE: LeagueScope = { leagueId: LEAGUE_ID, seasonYear: SEASON }

const LeagueScopeContext = createContext<LeagueScope>(DEFAULT_SCOPE)

interface LeagueScopeProviderProps {
    leagueId: number | null | undefined
    seasonYear: number | null | undefined
    children: ReactNode
}

/**
 * Scopes the team/player explorer to a league and season. Falls back to the
 * Premier League defaults when none is given.
 */
export const LeagueScopeProvider = ({ leagueId, seasonYear, children }: LeagueScopeProviderProps) => {
    const value = useMemo<LeagueScope>(
        () => ({
            leagueId: leagueId ?? DEFAULT_SCOPE.leagueId,
            seasonYear: seasonYear ?? DEFAULT_SCOPE.seasonYear,
        }),
        [leagueId, seasonYear],
    )

    return <LeagueScopeContext.Provider value={value}>{children}</LeagueScopeContext.Provider>
}

export const useLeagueScope = (): LeagueScope => useContext(LeagueScopeContext)

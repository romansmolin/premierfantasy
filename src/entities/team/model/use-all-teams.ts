'use client'

import useSWR from 'swr'

import { getAllTeams } from '@/entities/team/api/team.service'

import { useLeagueScope } from './league-scope.context'

export const useAllTeams = () => {
    const { leagueId, seasonYear } = useLeagueScope()

    const { data, error } = useSWR(
        ['/api/teams', leagueId, seasonYear],
        () => getAllTeams(leagueId, seasonYear),
        { suspense: true, fallbackData: [] },
    )

    return { teams: data, error }
}

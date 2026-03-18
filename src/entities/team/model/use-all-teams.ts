'use client'

import useSWR from 'swr'

import { getAllTeams } from '@/entities/team/api/team.service'

const TEAMS_API_URL = '/api/teams'

export const useAllTeams = () => {
    const { data, error } = useSWR(TEAMS_API_URL, () => getAllTeams(), { suspense: true, fallbackData: [] })

    return { teams: data, error }
}

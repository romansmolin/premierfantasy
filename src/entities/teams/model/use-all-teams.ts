import useSWR from 'swr'

import { getAllTeams } from '@/entities/team/api/team.service'

export const useAllTeams = () => {
    const { data, error, isLoading } = useSWR('/api/teams', () => getAllTeams())

    return { teams: data, error, isLoading }
}

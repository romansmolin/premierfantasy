'use client'

import useSWR from 'swr'

import { useSession } from '@/shared/lib/auth-client'

import { fantasyTeamService } from '../api/fantasy-team.service'

export const useFantasyTeams = () => {
    const { data: session } = useSession()
    const userId = session?.user?.id

    const { data, error, isLoading } = useSWR(userId ? `/api/fantasy-teams/user/${userId}` : null, () =>
        fantasyTeamService.getByUserId(userId!),
    )

    return { fantasyTeams: data, isLoading, error }
}

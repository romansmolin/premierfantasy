'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'

import { fantasyTeamService, useFantasyTeams } from '@/entities/fantasy-team'
import { MY_LEAGUES_KEY } from '@/entities/league'
import { BUDGET_TOTAL } from '@/entities/players'

import { ApiError } from '@/shared/api/api-error'
import { useSession } from '@/shared/lib/auth-client'

/**
 * Creates the user's team for a competition and opens the squad builder.
 * A team already exists? Then this just navigates — the server rejects
 * a second team for the same competition with a 409.
 */
export function useCreateFantasyTeam(competitionId: string | null) {
    const { data: session } = useSession()
    const router = useRouter()
    const { mutate: mutateGlobal } = useSWRConfig()
    const { fantasyTeams, mutate } = useFantasyTeams()
    const [isCreating, setIsCreating] = useState(false)

    const existingTeam = competitionId
        ? (fantasyTeams?.find((t) => t.competitionId === competitionId) ?? null)
        : null

    const builderHref = competitionId ? `/fantasy-team-builder?competitionId=${competitionId}` : null

    const createTeam = async () => {
        if (!competitionId || !builderHref) return

        if (!session?.user?.id) {
            toast.error('Sign in to create a team.')
            router.push('/sign-in')

            return
        }

        if (existingTeam) {
            router.push(builderHref)

            return
        }

        setIsCreating(true)

        try {
            await fantasyTeamService.create({
                userId: session.user.id,
                competitionId,
                name: `${session.user.name ?? 'Manager'}'s Team`,
                budgetLeft: BUDGET_TOTAL,
            })

            await Promise.all([mutate(), mutateGlobal(MY_LEAGUES_KEY)])

            toast.success('Team created. Now pick your squad.')
            router.push(builderHref)
        } catch (error) {
            // A 409 means the team is already there — treat it as success and continue.
            if (ApiError.isApiError(error) && error.status === 409) {
                await Promise.all([mutate(), mutateGlobal(MY_LEAGUES_KEY)])
                router.push(builderHref)

                return
            }

            toast.error(ApiError.isApiError(error) ? error.message : 'Failed to create team.')
        } finally {
            setIsCreating(false)
        }
    }

    return { createTeam, isCreating, existingTeam, builderHref }
}

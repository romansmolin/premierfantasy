'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'

import { leagueService, MY_LEAGUES_KEY } from '@/entities/league'

import { ApiError } from '@/shared/api/api-error'
import { useSession } from '@/shared/lib/auth-client'

interface UseJoinLeagueOptions {
    /** Where to send the user once they are enrolled. */
    redirectTo?: string
}

/**
 * Joins a league and refreshes "My Leagues" so the new membership shows up
 * without a page reload. Joining twice is a no-op server-side.
 */
export function useJoinLeague({ redirectTo }: UseJoinLeagueOptions = {}) {
    const { data: session } = useSession()
    const router = useRouter()
    const { mutate } = useSWRConfig()
    const [isJoining, setIsJoining] = useState(false)

    const join = async (leagueId: string, leagueName?: string) => {
        if (!session?.user?.id) {
            toast.error('Sign in to join a league.')
            router.push('/sign-in')

            return null
        }

        setIsJoining(true)

        try {
            const result = await leagueService.join(leagueId)

            await mutate(MY_LEAGUES_KEY)

            toast.success(
                result.alreadyMember
                    ? `You are already in ${leagueName ?? 'this league'}.`
                    : `Joined ${leagueName ?? 'the league'} for ${result.seasonYear}.`,
            )

            if (redirectTo) router.push(redirectTo)

            return result
        } catch (error) {
            const message = ApiError.isApiError(error) ? error.message : 'Failed to join league.'

            toast.error(message)

            return null
        } finally {
            setIsJoining(false)
        }
    }

    return { join, isJoining }
}

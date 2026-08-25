'use client'

import { Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRouter } from 'next/navigation'

import { useMyLeagues } from '@/entities/league'

import { Button } from '@/shared/ui/button'

import { useJoinLeague } from '../model/use-join-league'

interface JoinLeagueButtonProps {
    leagueId: string
    leagueName: string
    /** Competition to open once the user is in. Omitted while a league has no open round. */
    competitionId?: string | null
    size?: 'sm' | 'default'
    className?: string
}

export const JoinLeagueButton = ({
    leagueId,
    leagueName,
    competitionId,
    size = 'sm',
    className,
}: JoinLeagueButtonProps) => {
    const router = useRouter()
    const { myLeagues, isLoading } = useMyLeagues()
    const { join, isJoining } = useJoinLeague()

    const membership = myLeagues.find((l) => l.league.id === leagueId)
    const target = competitionId ? `/competitions/${competitionId}` : null

    if (membership) {
        return (
            <Button
                size={size}
                variant="outline"
                className={className}
                disabled={!target}
                onClick={() => target && router.push(target)}
            >
                <HugeiconsIcon icon={Tick02Icon} size={14} />
                {membership.fantasyTeam ? 'Open league' : 'Create team'}
            </Button>
        )
    }

    return (
        <Button
            size={size}
            className={className}
            disabled={isJoining || isLoading}
            onClick={async () => {
                const result = await join(leagueId, leagueName)

                if (result && target) router.push(target)
            }}
        >
            {isJoining ? 'Joining…' : 'Join league'}
        </Button>
    )
}

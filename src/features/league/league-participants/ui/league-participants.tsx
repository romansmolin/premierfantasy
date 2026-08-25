'use client'

import { Skeleton } from '@/shared/ui/skeleton'

import { useLeagueParticipants } from '../model/use-league-participants'

interface LeagueParticipantsProps {
    leagueSeasonId: string | null | undefined
    currentUserId?: string
}

export const LeagueParticipants = ({ leagueSeasonId, currentUserId }: LeagueParticipantsProps) => {
    const { participants, isLoading, error } = useLeagueParticipants(leagueSeasonId)

    if (!leagueSeasonId) {
        return (
            <p className="text-sm text-muted-foreground">This competition is not tied to a league season.</p>
        )
    }

    if (isLoading) return <Skeleton className="h-32" />

    if (error) return <p className="text-sm text-destructive">Failed to load participants.</p>

    if (participants.length === 0) {
        return <p className="text-sm text-muted-foreground">No managers have joined yet.</p>
    }

    return (
        <ul className="divide-y">
            {participants.map((participant) => (
                <li key={participant.membershipId} className="flex items-center justify-between gap-2 py-2">
                    <span className="truncate text-sm font-medium">
                        {participant.userName}
                        {participant.userId === currentUserId && (
                            <span className="text-muted-foreground"> (you)</span>
                        )}
                    </span>
                </li>
            ))}
        </ul>
    )
}

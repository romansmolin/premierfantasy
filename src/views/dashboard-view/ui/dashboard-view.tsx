'use client'

import { useCompetitionState } from '@/entities/competition'

import { useSession } from '@/shared/lib/auth-client'
import { Skeleton } from '@/shared/ui/skeleton'

import { DashboardActiveClosed } from './dashboard-active-closed'
import { DashboardActiveTeam } from './dashboard-active-team'
import { DashboardJoinActive } from './dashboard-join-active'
import { DashboardUpcomingTeam } from './dashboard-upcoming-team'

export function DashboardView() {
    const { data: session } = useSession()
    const { state, isLoading } = useCompetitionState()

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-48" />
            </div>
        )
    }

    if (!state) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Dashboard</h2>
                <p className="text-sm text-muted-foreground">Sign in to view your competition status.</p>
            </div>
        )
    }

    const userId = session?.user?.id ?? ''

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold">Dashboard</h2>
                <p className="text-sm text-muted-foreground">Your competition overview</p>
            </div>

            {state.canJoinActive && state.activeCompetition && (
                <DashboardJoinActive competition={state.activeCompetition} />
            )}

            {!state.canJoinActive && !state.hasTeamInActive && state.activeCompetition && (
                <DashboardActiveClosed
                    activeCompetition={state.activeCompetition}
                    upcomingCompetition={state.upcomingCompetition}
                />
            )}

            {state.hasTeamInActive && state.activeCompetition && (
                <DashboardActiveTeam
                    competition={state.activeCompetition}
                    userRank={state.userRankInActive}
                    userPoints={state.userPointsInActive}
                    userId={userId}
                />
            )}

            {state.hasTeamInUpcoming && !state.hasTeamInActive && state.upcomingCompetition && (
                <DashboardUpcomingTeam competition={state.upcomingCompetition} />
            )}

            {!state.activeCompetition && !state.upcomingCompetition && (
                <p className="text-sm text-muted-foreground">
                    No competitions available right now. Check back later.
                </p>
            )}
        </div>
    )
}

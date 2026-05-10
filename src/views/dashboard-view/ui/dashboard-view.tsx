'use client'

import { ChampionIcon, DashboardSquare01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { useCompetitionState } from '@/entities/competition'

import { useSession } from '@/shared/lib/auth-client'
import { buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
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
                <Skeleton className="h-10 w-56" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-64 rounded-xl" />
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
    const userName = session?.user?.name ?? 'Manager'

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
                    <HugeiconsIcon icon={DashboardSquare01Icon} size={20} className="text-primary" />
                </div>
                <div>
                    <h2 className="text-lg font-bold">
                        {state.hasTeamInActive ? `Welcome back, ${userName}` : `Welcome, ${userName}`}
                    </h2>
                    <p className="text-sm text-muted-foreground">Your competition overview</p>
                </div>
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
                <Card className="border-dashed">
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 shrink-0">
                                <HugeiconsIcon icon={ChampionIcon} size={20} className="text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <CardTitle>No Premier League round to join right now</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    But other leagues are mid-season — MLS, Brasileirão, J1, and more. Pick
                                    one and start playing today.
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Link href="/leagues" className={buttonVariants({ className: 'w-full gap-2' })}>
                            <HugeiconsIcon icon={ChampionIcon} size={16} />
                            Browse leagues
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

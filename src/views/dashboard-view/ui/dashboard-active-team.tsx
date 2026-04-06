'use client'

import { ChartLineData02Icon, Award01Icon, StarCircleIcon, GlobalIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import useSWR from 'swr'

import { LeaderboardTable } from '@/features/competition'

import type { ICompetition } from '@/entities/competition/model/competition.types'
import { gameweekService } from '@/entities/gameweek'

import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

import { CountdownTimer } from './countdown-timer'
import { UpcomingFixtures } from './upcoming-fixtures'

interface DashboardActiveTeamProps {
    competition: ICompetition
    userRank: number | null
    userPoints: number | null
    userId: string
}

export const DashboardActiveTeam = ({
    competition,
    userRank,
    userPoints,
    userId,
}: DashboardActiveTeamProps) => {
    const { data: activeGameweek } = useSWR('/api/gameweeks/active', () => gameweekService.getActive())
    const { data: allGameweeks } = useSWR('/api/gameweeks', () => gameweekService.getAll())

    const gwDeadline = activeGameweek?.deadline ?? activeGameweek?.startDate

    // Find the next gameweek's deadline (for when current deadline has passed)
    const nextGw = allGameweeks?.filter((gw) => gw.number === (activeGameweek?.number ?? 0) + 1)?.[0]
    const nextGwDeadline = nextGw?.deadline ?? nextGw?.startDate

    return (
        <div className="space-y-5">
            {/* Countdown */}
            {gwDeadline && (
                <CountdownTimer
                    deadline={new Date(gwDeadline)}
                    label={`GW${activeGameweek?.number} transfer deadline`}
                    nextDeadline={nextGwDeadline ? new Date(nextGwDeadline) : null}
                    nextLabel={`Next transfer window — GW${nextGw?.number}`}
                />
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex items-center justify-center size-12 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                            <HugeiconsIcon
                                icon={Award01Icon}
                                size={22}
                                className="text-amber-600 dark:text-amber-400"
                            />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Your Rank</p>
                            <p className="text-2xl font-bold">{userRank ?? '-'}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex items-center justify-center size-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                            <HugeiconsIcon
                                icon={StarCircleIcon}
                                size={22}
                                className="text-emerald-600 dark:text-emerald-400"
                            />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Total Points</p>
                            <p className="text-2xl font-bold">{userPoints ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex items-center justify-center size-12 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                            <HugeiconsIcon
                                icon={GlobalIcon}
                                size={22}
                                className="text-blue-600 dark:text-blue-400"
                            />
                        </div>
                        <div className="w-full">
                            <p className="text-xs text-muted-foreground font-medium">Competition</p>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-lg font-bold">{competition.name}</p>
                                <Badge variant="default">Active</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Leaderboard */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <HugeiconsIcon
                                icon={ChartLineData02Icon}
                                size={18}
                                className="text-muted-foreground"
                            />
                            <div>
                                <CardTitle>Leaderboard</CardTitle>
                                <CardDescription>Top performers in {competition.name}</CardDescription>
                            </div>
                        </div>
                        <Link
                            href={`/competitions/${competition.id}`}
                            className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                            View Full
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    <LeaderboardTable competitionId={competition.id} currentUserId={userId} />
                </CardContent>
            </Card>

            {/* Upcoming Fixtures */}
            <UpcomingFixtures />
        </div>
    )
}

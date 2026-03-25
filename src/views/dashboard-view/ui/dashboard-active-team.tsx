'use client'

import Link from 'next/link'

import { LeaderboardTable } from '@/features/competition'

import type { ICompetition } from '@/entities/competition/model/competition.types'

import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

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
    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Your Rank</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{userRank ?? '—'}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{userPoints ?? 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Competition</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <p className="text-lg font-semibold">{competition.name}</p>
                            <Badge variant="default">Active</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            GW{competition.startGameweek}–GW{competition.endGameweek}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Leaderboard</CardTitle>
                            <CardDescription>Top performers in {competition.name}</CardDescription>
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
        </div>
    )
}

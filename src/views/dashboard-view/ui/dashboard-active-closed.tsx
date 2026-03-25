'use client'

import Link from 'next/link'

import type { ICompetition } from '@/entities/competition/model/competition.types'

import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

interface DashboardActiveClosedProps {
    activeCompetition: ICompetition
    upcomingCompetition: ICompetition | null
}

export const DashboardActiveClosed = ({
    activeCompetition,
    upcomingCompetition,
}: DashboardActiveClosedProps) => {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{activeCompetition.name}</CardTitle>
                            <CardDescription>
                                Gameweeks {activeCompetition.startGameweek}–{activeCompetition.endGameweek}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary">Registration Closed</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        The current competition has already started. You can no longer join this one.
                    </p>
                </CardContent>
            </Card>

            {upcomingCompetition && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{upcomingCompetition.name}</CardTitle>
                                <CardDescription>
                                    Gameweeks {upcomingCompetition.startGameweek}–
                                    {upcomingCompetition.endGameweek}
                                </CardDescription>
                            </div>
                            <Badge variant="outline">Upcoming</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Link
                            href={`/fantasy-team-builder?competitionId=${upcomingCompetition.id}`}
                            className={buttonVariants()}
                        >
                            Join Next Competition
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

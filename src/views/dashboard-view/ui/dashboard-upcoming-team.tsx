'use client'

import Link from 'next/link'

import type { ICompetition } from '@/entities/competition/model/competition.types'

import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

interface DashboardUpcomingTeamProps {
    competition: ICompetition
}

export const DashboardUpcomingTeam = ({ competition }: DashboardUpcomingTeamProps) => {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{competition.name}</CardTitle>
                            <CardDescription>
                                Gameweeks {competition.startGameweek}–{competition.endGameweek}
                            </CardDescription>
                        </div>
                        <Badge variant="outline">Upcoming</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Your team is registered for this competition. It starts at GW
                        {competition.startGameweek}.
                    </p>
                    <Link
                        href={`/fantasy-team-builder?competitionId=${competition.id}`}
                        className={buttonVariants({ variant: 'outline' })}
                    >
                        Edit Team
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}

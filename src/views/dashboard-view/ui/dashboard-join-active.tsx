'use client'

import Link from 'next/link'

import type { ICompetition } from '@/entities/competition/model/competition.types'

import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

interface DashboardJoinActiveProps {
    competition: ICompetition
}

export const DashboardJoinActive = ({ competition }: DashboardJoinActiveProps) => {
    const deadline = competition.joinDeadline ? new Date(competition.joinDeadline) : null

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
                        <Badge variant="default">Active</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">Competition Rules</h3>
                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                            <li>Select 11 players for your squad</li>
                            <li>Budget: 100M</li>
                            <li>Maximum 3 players from any single club</li>
                        </ul>
                    </div>
                    {deadline && (
                        <p className="text-sm text-muted-foreground">
                            Join deadline:{' '}
                            {deadline.toLocaleDateString('en-GB', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                    )}
                    <Link
                        href={`/fantasy-team-builder?competitionId=${competition.id}`}
                        className={buttonVariants()}
                    >
                        Build Your Team for GW{competition.startGameweek}–GW{competition.endGameweek}
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}

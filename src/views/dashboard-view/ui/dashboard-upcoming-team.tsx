'use client'

import { Calendar03Icon, NoteEditIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import type { ICompetition } from '@/entities/competition/model/competition.types'

import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

interface DashboardUpcomingTeamProps {
    competition: ICompetition
}

export const DashboardUpcomingTeam = ({ competition }: DashboardUpcomingTeamProps) => {
    const deadline = competition.joinDeadline ? new Date(competition.joinDeadline) : null

    return (
        <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-10 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                        <HugeiconsIcon
                            icon={Calendar03Icon}
                            size={20}
                            className="text-blue-600 dark:text-blue-400"
                        />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <CardTitle>{competition.name}</CardTitle>
                            <Badge variant="outline">Upcoming</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Gameweeks {competition.startGameweek}–{competition.endGameweek}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    Your team is registered for this competition. It starts at GW{competition.startGameweek}.
                    {deadline && (
                        <>
                            {' '}
                            You can edit your squad until{' '}
                            <span className="font-medium text-foreground">
                                {deadline.toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                            .
                        </>
                    )}
                </p>
                <Link
                    href={`/fantasy-team-builder?competitionId=${competition.id}`}
                    className={buttonVariants({ variant: 'outline', className: 'gap-2' })}
                >
                    <HugeiconsIcon icon={NoteEditIcon} size={16} />
                    Edit Team
                </Link>
            </CardContent>
        </Card>
    )
}

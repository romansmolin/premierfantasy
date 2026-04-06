'use client'

import { AlertCircleIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import type { ICompetition } from '@/entities/competition/model/competition.types'

import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

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
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                            <HugeiconsIcon
                                icon={AlertCircleIcon}
                                size={20}
                                className="text-orange-600 dark:text-orange-400"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <CardTitle>{activeCompetition.name}</CardTitle>
                                <Badge variant="secondary">Registration Closed</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Gameweeks {activeCompetition.startGameweek}–{activeCompetition.endGameweek}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        This competition has already started. You can no longer join this one.
                    </p>
                </CardContent>
            </Card>

            {upcomingCompetition && (
                <Card className="border-emerald-200 dark:border-emerald-900">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                                <HugeiconsIcon
                                    icon={ArrowRight01Icon}
                                    size={20}
                                    className="text-emerald-600 dark:text-emerald-400"
                                />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <CardTitle>{upcomingCompetition.name}</CardTitle>
                                    <Badge variant="outline">Upcoming</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Gameweeks {upcomingCompetition.startGameweek}–
                                    {upcomingCompetition.endGameweek}
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Link
                            href={`/fantasy-team-builder?competitionId=${upcomingCompetition.id}`}
                            className={buttonVariants({ className: 'w-full gap-2' })}
                        >
                            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                            Join Next Competition
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

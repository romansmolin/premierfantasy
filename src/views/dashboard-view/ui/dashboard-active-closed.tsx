'use client'

import { AlertCircleIcon, ArrowRight01Icon, ChampionIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import type { ICompetition } from '@/entities/competition/model/competition.types'

import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

import { CountdownTimer } from './countdown-timer'

interface DashboardActiveClosedProps {
    activeCompetition: ICompetition
    upcomingCompetition: ICompetition | null
}

const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    })

export const DashboardActiveClosed = ({
    activeCompetition,
    upcomingCompetition,
}: DashboardActiveClosedProps) => {
    const opensAt = upcomingCompetition?.joinDeadline ? new Date(upcomingCompetition.joinDeadline) : null

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 shrink-0">
                            <HugeiconsIcon
                                icon={AlertCircleIcon}
                                size={20}
                                className="text-orange-600 dark:text-orange-400"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <CardTitle>{activeCompetition.name}</CardTitle>
                                <Badge variant="secondary">Registration Closed</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Gameweeks {activeCompetition.startGameweek}–{activeCompetition.endGameweek} ·
                                already in progress
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                        You missed the deadline for this Premier League round. Don&apos;t worry — there&apos;s
                        always another way to play.
                    </p>
                    {upcomingCompetition && opensAt ? (
                        <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">{upcomingCompetition.name}</span>{' '}
                            opens for registration on{' '}
                            <span className="font-medium text-foreground">{formatDate(opensAt)}</span>.
                        </p>
                    ) : (
                        <p className="text-muted-foreground">
                            We&apos;ll let you know as soon as the next Premier League round opens.
                        </p>
                    )}
                </CardContent>
            </Card>

            {upcomingCompetition && opensAt && (
                <Card className="border-emerald-200 dark:border-emerald-900">
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                                <HugeiconsIcon
                                    icon={ArrowRight01Icon}
                                    size={20}
                                    className="text-emerald-600 dark:text-emerald-400"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <CardTitle>{upcomingCompetition.name}</CardTitle>
                                    <Badge variant="outline">Up next</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Gameweeks {upcomingCompetition.startGameweek}–
                                    {upcomingCompetition.endGameweek}
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <CountdownTimer deadline={opensAt} label="Registration opens in" />
                        <Link
                            href={`/fantasy-team-builder?competitionId=${upcomingCompetition.id}`}
                            className={buttonVariants({ className: 'w-full gap-2' })}
                        >
                            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                            Reserve your spot
                        </Link>
                    </CardContent>
                </Card>
            )}

            <Card className="border-dashed">
                <CardHeader>
                    <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 shrink-0">
                            <HugeiconsIcon icon={ChampionIcon} size={20} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <CardTitle>Don&apos;t want to wait?</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Other leagues are in season right now — MLS, Brasileirão, J1, and more.
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Link
                        href="/leagues"
                        className={buttonVariants({ variant: 'outline', className: 'w-full gap-2' })}
                    >
                        <HugeiconsIcon icon={ChampionIcon} size={16} />
                        Browse other leagues
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}

'use client'

import { Coins01Icon, NoteEditIcon, UserMultiple02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import type { ICompetition } from '@/entities/competition/model/competition.types'

import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

import { CountdownTimer } from './countdown-timer'

interface DashboardJoinActiveProps {
    competition: ICompetition
}

export const DashboardJoinActive = ({ competition }: DashboardJoinActiveProps) => {
    const deadline = competition.joinDeadline ? new Date(competition.joinDeadline) : null

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                            <HugeiconsIcon
                                icon={NoteEditIcon}
                                size={20}
                                className="text-emerald-600 dark:text-emerald-400"
                            />
                        </div>
                        <div>
                            <CardTitle>{competition.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Gameweeks {competition.startGameweek}–{competition.endGameweek}
                            </p>
                        </div>
                    </div>
                    <Badge variant="default">Open for Registration</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 rounded-xl border p-4">
                        <HugeiconsIcon
                            icon={UserMultiple02Icon}
                            size={20}
                            className="text-blue-500 shrink-0"
                        />
                        <div>
                            <p className="text-xs text-muted-foreground">Squad Size</p>
                            <p className="text-sm font-bold">11 Players</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border p-4">
                        <HugeiconsIcon icon={Coins01Icon} size={20} className="text-amber-500 shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">Budget</p>
                            <p className="text-sm font-bold">100M</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border p-4">
                        <HugeiconsIcon
                            icon={UserMultiple02Icon}
                            size={20}
                            className="text-violet-500 shrink-0"
                        />
                        <div>
                            <p className="text-xs text-muted-foreground">Max Per Club</p>
                            <p className="text-sm font-bold">3 Players</p>
                        </div>
                    </div>
                </div>

                {deadline && <CountdownTimer deadline={deadline} />}

                <Link
                    href={`/fantasy-team-builder?competitionId=${competition.id}`}
                    className={buttonVariants({ size: 'lg', className: 'w-full gap-2' })}
                >
                    <HugeiconsIcon icon={NoteEditIcon} size={18} />
                    Build Your Team for GW{competition.startGameweek}–GW{competition.endGameweek}
                </Link>
            </CardContent>
        </Card>
    )
}

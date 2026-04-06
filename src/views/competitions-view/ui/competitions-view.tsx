'use client'

import { ChampionIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { CompetitionList } from '@/features/competition'

import { buttonVariants } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'

export const CompetitionsView = () => {
    return (
        <div className="space-y-4">
            <div>
                <p className="text-sm text-muted-foreground">Browse fantasy football competitions</p>
            </div>
            <CompetitionList />
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center text-center py-8">
                    <div className="flex items-center justify-center size-12 rounded-full bg-muted mb-3">
                        <HugeiconsIcon icon={ChampionIcon} size={20} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mb-1">Rolling Competitions</p>
                    <p className="text-xs text-muted-foreground max-w-sm mb-4">
                        Competitions run every 5 gameweeks. Join the active competition from your Dashboard to
                        start earning points and climbing the leaderboard.
                    </p>
                    <Link href="/dashboard" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                        Go to Dashboard
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}

'use client'

import { ChampionIcon, DashboardSquare01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { MyLeaguesList } from '@/features/league'

import { sortMyLeagues, useMyLeagues } from '@/entities/league'

import { useSession } from '@/shared/lib/auth-client'
import { buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

import { LeagueFixturesPanel } from './league-fixtures-panel'
import { UpcomingFixtures } from './upcoming-fixtures'

export function DashboardView() {
    const { data: session } = useSession()
    const { myLeagues, isLoading } = useMyLeagues()

    const userName = session?.user?.name ?? 'Manager'

    // Fixtures below the fold default to whichever league is live first; the
    // panel lets the user switch between every league they have joined.
    const orderedLeagues = sortMyLeagues(myLeagues)

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-56" />
                <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-48 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-64 rounded-xl" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
                    <HugeiconsIcon icon={DashboardSquare01Icon} size={20} className="text-primary" />
                </div>
                <div>
                    <h2 className="text-lg font-bold">
                        {myLeagues.length > 0 ? `Welcome back, ${userName}` : `Welcome, ${userName}`}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {myLeagues.length > 0
                            ? `You are competing in ${myLeagues.length} ${myLeagues.length === 1 ? 'league' : 'leagues'}`
                            : 'Your competition overview'}
                    </p>
                </div>
            </div>

            <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                        My Leagues
                    </h3>
                    <Link href="/leagues" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                        Browse all
                    </Link>
                </div>
                <MyLeaguesList />
            </section>

            {myLeagues.length === 0 && (
                <Card className="border-dashed">
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 shrink-0">
                                <HugeiconsIcon icon={ChampionIcon} size={20} className="text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <CardTitle>How it works</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Join a league, pick 11 players inside a 100M budget (max 3 per club), and
                                    score points every gameweek. You can run a separate team in as many
                                    leagues as you like.
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Link href="/leagues" className={buttonVariants({ className: 'w-full gap-2' })}>
                            <HugeiconsIcon icon={ChampionIcon} size={16} />
                            Browse leagues
                        </Link>
                    </CardContent>
                </Card>
            )}

            {orderedLeagues.length > 0 ? (
                <LeagueFixturesPanel leagues={orderedLeagues} />
            ) : (
                <UpcomingFixtures />
            )}
        </div>
    )
}

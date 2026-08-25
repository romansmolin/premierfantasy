'use client'

import { Calendar03Icon, ChampionIcon, Clock01Icon, UserGroupIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useNextFixtures } from '@/entities/fixtures'
import type { IFixture } from '@/entities/fixtures'
import { resolveJoinWindow, resolveMyLeagueCta, sortMyLeagues, useMyLeagues } from '@/entities/league'
import type { IMyLeague } from '@/entities/league'

import { Badge } from '@/shared/ui/badge'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

import { JoinCountdown } from './join-countdown'

interface MyLeaguesListProps {
    /** Cap the number of cards rendered. Omit to show every joined league. */
    limit?: number
}

const formatKickoff = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })

const formatRound = (round: string) => round.replace('Regular Season - ', 'GW')

export const MyLeaguesList = ({ limit }: MyLeaguesListProps) => {
    const { myLeagues, isLoading, isSignedIn, error } = useMyLeagues()

    const sorted = sortMyLeagues(myLeagues)
    const visible = limit ? sorted.slice(0, limit) : sorted

    // One request covers every card; the server caches per league for 10 minutes.
    const { nextFixtureFor, isLoading: isLoadingFixtures } = useNextFixtures(
        visible.map((league) => ({
            leagueExternalId: league.league.externalId,
            season: league.season.year,
        })),
    )

    if (isLoading) {
        return (
            <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
            </div>
        )
    }

    if (!isSignedIn) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Sign in to see the leagues you have joined.
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
                Failed to load your leagues. Try refreshing the page.
            </div>
        )
    }

    if (myLeagues.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                        <HugeiconsIcon icon={ChampionIcon} size={20} className="text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        You have not joined a league yet. Join as many as you like — you get a separate
                        fantasy team in each.
                    </p>
                    <Link href="/leagues" className={buttonVariants({ size: 'sm' })}>
                        Browse leagues
                    </Link>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {visible.map((league) => (
                <MyLeagueCard
                    key={league.membershipId}
                    league={league}
                    nextFixture={nextFixtureFor(league.league.externalId)}
                    isLoadingFixture={isLoadingFixtures}
                />
            ))}
        </div>
    )
}

interface MyLeagueCardProps {
    league: IMyLeague
    nextFixture: IFixture | null
    isLoadingFixture: boolean
}

const MyLeagueCard = ({ league, nextFixture, isLoadingFixture }: MyLeagueCardProps) => {
    const router = useRouter()
    const cta = resolveMyLeagueCta(league)
    const joinWindow = resolveJoinWindow(league)
    const competition = league.activeCompetition ?? league.nextCompetition
    const team = league.fantasyTeam

    return (
        <Card className="flex flex-col">
            <CardContent className="flex flex-col gap-3 py-5">
                <div className="flex items-start gap-3">
                    {league.league.logo ? (
                        <Image
                            src={league.league.logo}
                            alt={`${league.league.name} logo`}
                            width={36}
                            height={36}
                            className="size-9 shrink-0 rounded bg-white object-contain"
                            unoptimized
                        />
                    ) : (
                        <div className="size-9 shrink-0 rounded bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="truncate font-semibold">{league.league.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    Season {league.season.year} · {league.league.country}
                                </p>
                            </div>
                            {league.activeCompetition ? (
                                <Badge className="shrink-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                    Live
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="shrink-0">
                                    Joined
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-1 text-sm">
                    {competition ? (
                        <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">{competition.name}</span> · GW
                            {competition.startGameweek}–{competition.endGameweek}
                        </p>
                    ) : (
                        <p className="text-muted-foreground">Waiting for the next round to open.</p>
                    )}

                    {team && team.rank !== null && (
                        <p className="text-muted-foreground">
                            Rank <span className="font-medium text-foreground">#{team.rank}</span> ·{' '}
                            <span className="font-medium text-foreground">{team.totalPoints}</span> pts
                        </p>
                    )}
                </div>

                <div className="space-y-1.5 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                    <p className="flex items-center gap-1.5">
                        <HugeiconsIcon
                            icon={Clock01Icon}
                            size={14}
                            className="shrink-0 text-muted-foreground"
                        />
                        {joinWindow.state === 'OPEN' ? (
                            joinWindow.deadline ? (
                                <span className="text-muted-foreground">
                                    Joining closes in <JoinCountdown deadline={joinWindow.deadline} />
                                </span>
                            ) : (
                                <span className="text-muted-foreground">Joining is open</span>
                            )
                        ) : joinWindow.state === 'CLOSED' ? (
                            <span className="text-muted-foreground">
                                Joining closed — wait for the next round
                            </span>
                        ) : (
                            <span className="text-muted-foreground">No round scheduled yet</span>
                        )}
                    </p>

                    <p className="flex items-center gap-1.5">
                        <HugeiconsIcon
                            icon={Calendar03Icon}
                            size={14}
                            className="shrink-0 text-muted-foreground"
                        />
                        {isLoadingFixture ? (
                            <Skeleton className="h-3 w-40" />
                        ) : nextFixture ? (
                            <span className="truncate text-muted-foreground">
                                Next: {nextFixture.homeTeam.name} v {nextFixture.awayTeam.name} ·{' '}
                                <span className="font-medium text-foreground">
                                    {formatKickoff(nextFixture.date)}
                                </span>{' '}
                                ({formatRound(nextFixture.round)})
                            </span>
                        ) : (
                            <span className="text-muted-foreground">No scheduled fixtures</span>
                        )}
                    </p>

                    <p className="flex items-center gap-1.5 text-muted-foreground">
                        <HugeiconsIcon icon={UserGroupIcon} size={14} className="shrink-0" />
                        {league.participantCount} {league.participantCount === 1 ? 'manager' : 'managers'}
                        {team && !team.isComplete && <span> · squad {team.playerCount}/11</span>}
                    </p>
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Button
                        size="sm"
                        variant={cta.action === 'VIEW_TEAM' ? 'outline' : 'default'}
                        disabled={!cta.href}
                        onClick={() => cta.href && router.push(cta.href)}
                    >
                        {cta.label}
                    </Button>
                    {cta.competitionId && (
                        <Link
                            href={`/competitions/${cta.competitionId}`}
                            className={buttonVariants({ size: 'sm', variant: 'ghost' })}
                        >
                            Standings
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

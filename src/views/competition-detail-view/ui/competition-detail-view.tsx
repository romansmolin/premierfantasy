'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'

import { LeaderboardTable } from '@/features/competition'
import { CreateFantasyTeamButton } from '@/features/fantasy-team'
import { LeagueParticipants } from '@/features/league'

import { competitionService } from '@/entities/competition'
import type { CompetitionStatus } from '@/entities/competition'
import { useFantasyTeams } from '@/entities/fantasy-team'

import { useSession } from '@/shared/lib/auth-client'
import { Badge } from '@/shared/ui/badge'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

const statusVariant: Record<CompetitionStatus, 'outline' | 'default' | 'secondary'> = {
    upcoming: 'outline',
    active: 'default',
    completed: 'secondary',
}

const formatDeadline = (value: Date | string) =>
    new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export const CompetitionDetailView = () => {
    const { id } = useParams<{ id: string }>()
    const [now] = useState(() => Date.now())

    const { data: competition, isLoading } = useSWR(`/api/competitions/${id}`, () =>
        competitionService.getById(id),
    )
    const { fantasyTeams, isLoading: isLoadingTeams } = useFantasyTeams()
    const { data: session } = useSession()
    const currentUserId = session?.user?.id

    if (isLoading) return <Skeleton className="h-96" />

    if (!competition) return <p className="text-sm text-destructive">Competition not found.</p>

    const hasTeam = !!fantasyTeams?.some((team) => team.competitionId === competition.id)
    const deadline = competition.joinDeadline ? new Date(competition.joinDeadline) : null
    const isJoinOpen = competition.status !== 'completed' && (!deadline || deadline.getTime() > now)

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    {competition.league?.logo && (
                        <Image
                            src={competition.league.logo}
                            alt={`${competition.league.name} logo`}
                            width={40}
                            height={40}
                            className="size-10 shrink-0 rounded bg-white object-contain"
                            unoptimized
                        />
                    )}
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold">{competition.name}</h2>
                            <Badge variant={statusVariant[competition.status]}>{competition.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {competition.league
                                ? `${competition.league.name} · ${competition.league.country}`
                                : 'Premier League'}
                            {competition.seasonYear ? ` · ${competition.seasonYear}` : ''} · GW{' '}
                            {competition.startGameweek} &rarr; GW {competition.endGameweek}
                        </p>
                        {deadline && (
                            <p className="text-sm text-muted-foreground">
                                {isJoinOpen
                                    ? `Join by ${formatDeadline(deadline)}`
                                    : `Join window closed ${formatDeadline(deadline)}`}
                            </p>
                        )}
                    </div>
                </div>
                <Link href="/competitions" className={buttonVariants({ variant: 'outline' })}>
                    Back to Competitions
                </Link>
            </div>

            <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
                    <div className="text-sm">
                        {isLoadingTeams ? (
                            <Skeleton className="h-5 w-48" />
                        ) : hasTeam ? (
                            <p className="text-muted-foreground">
                                You are in this competition. Manage your squad any time before the next
                                gameweek deadline.
                            </p>
                        ) : isJoinOpen ? (
                            <p className="text-muted-foreground">
                                Create your team, then pick 11 players inside the budget to enter this
                                competition.
                            </p>
                        ) : (
                            <p className="text-muted-foreground">Joining is closed for this competition.</p>
                        )}
                    </div>

                    {isLoadingTeams ? (
                        <Skeleton className="h-9 w-40" />
                    ) : hasTeam || isJoinOpen ? (
                        <CreateFantasyTeamButton competitionId={competition.id} />
                    ) : (
                        <Button disabled>Joining closed</Button>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Standings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <LeaderboardTable competitionId={id} currentUserId={currentUserId} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Participants</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <LeagueParticipants
                            leagueSeasonId={competition.leagueSeasonId}
                            currentUserId={currentUserId}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

'use client'

import { Clock01Icon, UserSwitchIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

import { FantasyTeamField, useHydrateSquad } from '@/features/fantasy-team'
import { LeagueSwitcher } from '@/features/league'
import { PlayersExplorer, SelectionSummary } from '@/features/player'
import { TransferModeProvider, useTransferMode } from '@/features/player/transfer'
import { TransferModal } from '@/features/player/transfer/ui/transfer-modal'

import { competitionService, useCompetitionState } from '@/entities/competition'
import { gameweekService } from '@/entities/gameweek'
import { sortMyLeagues, useMyLeagues } from '@/entities/league'
import type { IMyLeague } from '@/entities/league'
import { usePlayersStorage } from '@/entities/players'
import { LeagueScopeProvider } from '@/entities/team'

import { Badge } from '@/shared/ui/badge'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

export const FantasyTeamBuilderView = () => {
    useHydrateSquad()

    const transferMode = useTransferMode()
    const selectedPlayers = usePlayersStorage((s) => s.selectedPlayers)
    const router = useRouter()
    const searchParams = useSearchParams()
    const competitionIdParam = searchParams.get('competitionId')
    const { state } = useCompetitionState()
    const { myLeagues, isLoading: isLoadingLeagues } = useMyLeagues()
    const [transferModalOpen, setTransferModalOpen] = useState(false)

    const orderedLeagues = sortMyLeagues(myLeagues)

    // Every joined league that currently has a round to build for.
    const buildableLeagues = orderedLeagues.filter(
        (league) => league.activeCompetition ?? league.nextCompetition,
    )

    const competitionIdFor = (league: IMyLeague) =>
        (league.activeCompetition ?? league.nextCompetition)?.id ?? null

    // A league the user joined wins over the old global pick, so landing here
    // without a competitionId opens the league they are most likely playing.
    const resolvedCompetitionId =
        competitionIdParam ??
        (buildableLeagues[0] ? competitionIdFor(buildableLeagues[0]) : null) ??
        state?.activeCompetition?.id ??
        state?.upcomingCompetition?.id ??
        null

    const selectedLeague =
        buildableLeagues.find((league) => competitionIdFor(league) === resolvedCompetitionId) ?? null

    useEffect(() => {
        if (!competitionIdParam && resolvedCompetitionId) {
            router.replace(`/fantasy-team-builder?competitionId=${resolvedCompetitionId}`)
        }
    }, [competitionIdParam, resolvedCompetitionId, router])

    const { data: competition, isLoading: isLoadingCompetition } = useSWR(
        resolvedCompetitionId ? `/api/competitions/${resolvedCompetitionId}` : null,
        () => competitionService.getById(resolvedCompetitionId!),
    )

    // Check if transfer window is open
    const { data: activeGameweek } = useSWR('/api/gameweeks/active', () => gameweekService.getActive())
    const { data: allGameweeks } = useSWR('/api/gameweeks', () => gameweekService.getAll())

    const now = new Date()
    const currentDeadline = activeGameweek?.deadline ?? activeGameweek?.startDate
    const isCurrentWindowOpen = currentDeadline ? now < new Date(currentDeadline) : false

    // If current deadline passed, check the next gameweek's deadline
    const nextGw = allGameweeks?.filter((gw) => gw.number === (activeGameweek?.number ?? 0) + 1)?.[0]
    const nextDeadline = nextGw?.deadline ?? nextGw?.startDate
    const isNextWindowOpen = nextDeadline ? now < new Date(nextDeadline) : false

    const isTransferWindowOpen = isCurrentWindowOpen || isNextWindowOpen
    const canEditSquad = !transferMode.isTransferMode || isTransferWindowOpen

    if (!resolvedCompetitionId) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Fantasy Team Builder</h2>
                {isLoadingLeagues ? (
                    <Skeleton className="h-5 w-72" />
                ) : myLeagues.length === 0 ? (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Join a league first — you build a separate team in each one.
                        </p>
                        <Link href="/leagues" className={buttonVariants({ size: 'sm' })}>
                            Browse leagues
                        </Link>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        None of your leagues has a round open right now. Check back later.
                    </p>
                )}
            </div>
        )
    }

    return (
        // The joined-league row is already in memory, so the player pool stays on the
        // right league while the freshly keyed competition request is still in flight.
        <LeagueScopeProvider
            leagueId={competition?.league?.externalId ?? selectedLeague?.league.externalId}
            seasonYear={competition?.seasonYear ?? selectedLeague?.season.year}
        >
            <TransferModeProvider value={transferMode}>
                <div className="space-y-4 h-full flex flex-col">
                    <div className="flex flex-col gap-3">
                        <LeagueSwitcher
                            leagues={buildableLeagues}
                            selectedMembershipId={selectedLeague?.membershipId ?? null}
                            showTeamState
                            onSelect={(league) => {
                                const nextCompetitionId = competitionIdFor(league)

                                if (nextCompetitionId && nextCompetitionId !== resolvedCompetitionId) {
                                    router.replace(`/fantasy-team-builder?competitionId=${nextCompetitionId}`)
                                }
                            }}
                        />

                        <div className="flex items-center justify-between">
                            {isLoadingCompetition ? (
                                <Skeleton className="h-8 w-64" />
                            ) : competition ? (
                                <div className="flex items-center gap-3">
                                    {competition.league?.logo && (
                                        <Image
                                            src={competition.league.logo}
                                            alt={`${competition.league.name} logo`}
                                            width={32}
                                            height={32}
                                            className="size-8 shrink-0 rounded bg-white object-contain"
                                            unoptimized
                                        />
                                    )}
                                    <div>
                                        <h2 className="text-lg font-semibold">{competition.name}</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Gameweeks {competition.startGameweek}–{competition.endGameweek}
                                            {competition.joinDeadline && (
                                                <>
                                                    {' '}
                                                    &middot; Join by{' '}
                                                    {new Date(competition.joinDeadline).toLocaleDateString(
                                                        'en-GB',
                                                        {
                                                            day: 'numeric',
                                                            month: 'short',
                                                        },
                                                    )}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <Badge variant={competition.status === 'active' ? 'default' : 'outline'}>
                                        {competition.status}
                                    </Badge>
                                </div>
                            ) : (
                                <div>
                                    <h2 className="text-lg font-semibold">Fantasy Team Builder</h2>
                                    <p className="text-sm text-destructive">Competition not found.</p>
                                </div>
                            )}

                            {transferMode.isTransferMode && (
                                <Button
                                    className="gap-1"
                                    onClick={() => setTransferModalOpen(true)}
                                    disabled={!isTransferWindowOpen}
                                >
                                    <HugeiconsIcon
                                        icon={isTransferWindowOpen ? UserSwitchIcon : Clock01Icon}
                                        size={16}
                                    />
                                    {isTransferWindowOpen ? 'Make Transfer' : 'Window Closed'}
                                </Button>
                            )}
                        </div>

                        {transferMode.isTransferMode && !isTransferWindowOpen && (
                            <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-3">
                                <HugeiconsIcon
                                    icon={Clock01Icon}
                                    size={16}
                                    className="text-amber-600 shrink-0"
                                />
                                <p className="text-sm text-amber-700 dark:text-amber-400">
                                    Transfer window is closed. You can make changes when the next gameweek
                                    window opens
                                    {nextDeadline && (
                                        <>
                                            {' '}
                                            on{' '}
                                            <span className="font-medium">
                                                {new Date(nextDeadline).toLocaleDateString('en-GB', {
                                                    weekday: 'short',
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </>
                                    )}
                                    .
                                </p>
                            </div>
                        )}

                        {!transferMode.isTransferMode && selectedPlayers.length === 0 && (
                            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20 px-4 py-3">
                                <span className="text-2xl">👆</span>
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                    <span className="font-medium">Getting started:</span> Select a team badge
                                    above to browse players, then check the box next to a player to add them
                                    to your squad.
                                </p>
                            </div>
                        )}

                        <div className="flex w-full gap-3">
                            <Card className="flex-2 min-w-0 overflow-hidden">
                                <CardHeader>
                                    <CardTitle>Players Explorer</CardTitle>
                                    <CardDescription>
                                        Select teams where your desired players are playing
                                    </CardDescription>
                                </CardHeader>

                                <CardContent>
                                    <PlayersExplorer />
                                </CardContent>
                            </Card>

                            <div className="flex-1 flex flex-col gap-3">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Squad Builder</CardTitle>
                                        <CardDescription>Your selected players in formation</CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        <FantasyTeamField />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Selection Summary</CardTitle>
                                        <CardDescription>
                                            Your squad budget, positions, and selected players
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        <SelectionSummary />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>

                {canEditSquad && (
                    <TransferModal
                        open={transferModalOpen}
                        onClose={() => setTransferModalOpen(false)}
                        squad={selectedPlayers}
                    />
                )}
            </TransferModeProvider>
        </LeagueScopeProvider>
    )
}

'use client'

import { Clock01Icon, UserSwitchIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

import { FantasyTeamField, useHydrateSquad } from '@/features/fantasy-team'
import { PlayersExplorer, SelectionSummary } from '@/features/player'
import { TransferModeProvider, useTransferMode } from '@/features/player/transfer'
import { TransferModal } from '@/features/player/transfer/ui/transfer-modal'

import { competitionService, useCompetitionState } from '@/entities/competition'
import { gameweekService } from '@/entities/gameweek'
import { usePlayersStorage } from '@/entities/players'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
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
    const [transferModalOpen, setTransferModalOpen] = useState(false)

    const resolvedCompetitionId =
        competitionIdParam ?? state?.activeCompetition?.id ?? state?.upcomingCompetition?.id ?? null

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
                <p className="text-sm text-muted-foreground">
                    No active competition to join. Check back later.
                </p>
            </div>
        )
    }

    return (
        <TransferModeProvider value={transferMode}>
            <div className="space-y-4 h-full flex flex-col">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        {isLoadingCompetition ? (
                            <Skeleton className="h-8 w-64" />
                        ) : competition ? (
                            <div className="flex items-center gap-3">
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
                            <HugeiconsIcon icon={Clock01Icon} size={16} className="text-amber-600 shrink-0" />
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                Transfer window is closed. You can make changes when the next gameweek window
                                opens
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
    )
}

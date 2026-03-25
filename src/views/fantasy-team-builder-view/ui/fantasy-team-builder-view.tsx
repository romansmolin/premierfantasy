'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import useSWR from 'swr'

import { FantasyTeamField, useHydrateSquad } from '@/features/fantasy-team'
import { PlayersExplorer, SelectionSummary } from '@/features/player'

import { competitionService, useCompetitionState } from '@/entities/competition'

import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

export const FantasyTeamBuilderView = () => {
    useHydrateSquad()

    const router = useRouter()
    const searchParams = useSearchParams()
    const competitionIdParam = searchParams.get('competitionId')
    const { state } = useCompetitionState()

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
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex flex-col gap-3">
                <div>
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
                                            {new Date(competition.joinDeadline).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                            })}
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
                </div>

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
    )
}

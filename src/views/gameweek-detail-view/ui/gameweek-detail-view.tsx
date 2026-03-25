'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'

import { useGameweekDetail } from '@/features/competition/gameweek-detail/model/use-gameweek-detail'
import { GameweekDetailPitch } from '@/features/competition/gameweek-detail/ui/gameweek-detail-pitch'
import { GameweekDetailTable } from '@/features/competition/gameweek-detail/ui/gameweek-detail-table'
import { GameweekNavigator } from '@/features/competition/gameweek-detail/ui/gameweek-navigator'

import { competitionService } from '@/entities/competition'

import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

export const GameweekDetailView = () => {
    const { id: competitionId, gameweekNumber: gwParam } = useParams<{
        id: string
        gameweekNumber: string
    }>()

    const [selectedGw, setSelectedGw] = useState(Number(gwParam))

    const { data: competition } = useSWR(`/api/competitions/${competitionId}`, () =>
        competitionService.getById(competitionId),
    )

    // For now, we need a fantasyTeamId. This would come from the user's context.
    // Placeholder: use URL param or first team in competition
    const fantasyTeamId = '' // Will be resolved via user context later

    const { players, isLoading } = useGameweekDetail(fantasyTeamId, selectedGw)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Gameweek {selectedGw}</h2>
                    <p className="text-sm text-muted-foreground">{competition?.name ?? 'Loading...'}</p>
                </div>
                <Link href={`/competitions/${competitionId}`}>
                    <Button variant="outline">Back to Competition</Button>
                </Link>
            </div>

            {competition && (
                <GameweekNavigator
                    startGameweek={competition.startGameweek}
                    endGameweek={competition.endGameweek}
                    currentGameweek={selectedGw}
                    onSelect={setSelectedGw}
                />
            )}

            {isLoading ? (
                <Skeleton className="h-96" />
            ) : players?.length ? (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pitch View</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <GameweekDetailPitch players={players} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Stats Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <GameweekDetailTable players={players} />
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">No data available for this gameweek.</p>
            )}
        </div>
    )
}

'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'

import { LeaderboardTable } from '@/features/competition'

import { competitionService } from '@/entities/competition'
import type { CompetitionStatus } from '@/entities/competition'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

const statusVariant: Record<CompetitionStatus, 'outline' | 'default' | 'secondary'> = {
    upcoming: 'outline',
    active: 'default',
    completed: 'secondary',
}

export const CompetitionDetailView = () => {
    const { id } = useParams<{ id: string }>()

    const { data: competition, isLoading } = useSWR(`/api/competitions/${id}`, () =>
        competitionService.getById(id),
    )

    if (isLoading) return <Skeleton className="h-96" />

    if (!competition) return <p className="text-sm text-destructive">Competition not found.</p>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold">{competition.name}</h2>
                        <Badge variant={statusVariant[competition.status]}>{competition.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        GW {competition.startGameweek} &rarr; GW {competition.endGameweek}
                    </p>
                </div>
                <Link href="/competitions">
                    <Button variant="outline">Back to Competitions</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <LeaderboardTable competitionId={id} />
                </CardContent>
            </Card>
        </div>
    )
}

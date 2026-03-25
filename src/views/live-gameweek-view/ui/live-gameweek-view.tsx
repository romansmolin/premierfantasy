'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import { useLiveGameweek } from '@/features/competition/live-gameweek/model/use-live-gameweek'
import { LiveMatchTicker } from '@/features/competition/live-gameweek/ui/live-match-ticker'
import { LivePitchView } from '@/features/competition/live-gameweek/ui/live-pitch-view'
import { LivePointsFeed } from '@/features/competition/live-gameweek/ui/live-points-feed'

import type { LiveFixtureResult } from '@/entities/gameweek/model/gameweek-live.types'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

export const LiveGameweekView = () => {
    const { id: competitionId } = useParams<{ id: string }>()

    // Placeholder values - will be resolved from user context and active gameweek
    const gameweekId = ''
    const fantasyTeamId = ''

    const { livePoints, isLoading } = useLiveGameweek(gameweekId, fantasyTeamId)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">Live Gameweek</h2>
                    <Badge variant="destructive">LIVE</Badge>
                </div>
                <Link href={`/competitions/${competitionId}`}>
                    <Button variant="outline">Back to Competition</Button>
                </Link>
            </div>

            {isLoading ? (
                <Skeleton className="h-96" />
            ) : livePoints ? (
                <div className="space-y-6">
                    {livePoints.fixtures.length > 0 && (
                        <LiveMatchTicker fixtures={livePoints.fixtures as LiveFixtureResult[]} />
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Your Team — {livePoints.totalLivePoints} pts</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <LivePitchView players={livePoints.players} />
                                </CardContent>
                            </Card>
                        </div>

                        <div>
                            <LivePointsFeed players={livePoints.players} />
                        </div>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">
                    No live data available. Check back during match day.
                </p>
            )}
        </div>
    )
}

'use client'

import { AiBrain01Icon, Calendar03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import useSWR from 'swr'

import { fixtureService } from '@/entities/fixtures'
import { useMatchPrediction, MatchPredictionModal } from '@/features/ai'

import type { IFixture } from '@/entities/fixtures'

import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

function groupByRound(fixtures: IFixture[]): Record<string, IFixture[]> {
    const groups: Record<string, IFixture[]> = {}

    for (const f of fixtures) {
        const round = f.round.replace('Regular Season - ', 'GW')

        if (!groups[round]) groups[round] = []

        groups[round].push(f)
    }

    return groups
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr)

    return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export const UpcomingFixtures = () => {
    const matchPrediction = useMatchPrediction()
    const {
        data: fixtures,
        isLoading,
        error,
    } = useSWR('/api/fixtures/upcoming', () => fixtureService.getUpcoming(20))

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Fixtures</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 rounded-lg" />
                    ))}
                </CardContent>
            </Card>
        )
    }

    if (error || !fixtures) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Fixtures</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Could not load fixtures.</p>
                </CardContent>
            </Card>
        )
    }

    const grouped = groupByRound(fixtures)

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={Calendar03Icon} size={18} className="text-muted-foreground" />
                    <div>
                        <CardTitle>Upcoming Fixtures</CardTitle>
                        <CardDescription>Next Premier League matches</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {Object.entries(grouped).map(([round, roundFixtures]) => (
                    <div key={round}>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            {round}
                        </p>
                        <div className="space-y-1.5">
                            {roundFixtures.map((fixture) => (
                                <div
                                    key={fixture.id}
                                    className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                                >
                                    <div className="flex items-center gap-2 flex-1 justify-end">
                                        <span className="text-sm font-medium text-right truncate">
                                            {fixture.homeTeam.name}
                                        </span>
                                        <Image
                                            src={fixture.homeTeam.logo}
                                            alt={fixture.homeTeam.name}
                                            width={24}
                                            height={24}
                                            className="size-6 object-contain"
                                        />
                                    </div>

                                    <div className="shrink-0 w-20 text-center">
                                        <p className="text-xs text-muted-foreground">
                                            {formatDate(fixture.date)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-1">
                                        <Image
                                            src={fixture.awayTeam.logo}
                                            alt={fixture.awayTeam.name}
                                            width={24}
                                            height={24}
                                            className="size-6 object-contain"
                                        />
                                        <span className="text-sm font-medium truncate">
                                            {fixture.awayTeam.name}
                                        </span>
                                    </div>

                                    <Button
                                        size="xs"
                                        variant="outline"
                                        disabled={
                                            !matchPrediction.canAfford ||
                                            (matchPrediction.isLoading &&
                                                matchPrediction.activeFixtureId === fixture.id)
                                        }
                                        onClick={() => matchPrediction.requestPrediction(fixture.id)}
                                        className="shrink-0"
                                    >
                                        <HugeiconsIcon icon={AiBrain01Icon} data-icon="inline-start" />
                                        {matchPrediction.isLoading &&
                                        matchPrediction.activeFixtureId === fixture.id
                                            ? 'Loading...'
                                            : `${matchPrediction.cost}`}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {fixtures.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No upcoming fixtures scheduled.
                    </p>
                )}
            </CardContent>

            <MatchPredictionModal
                open={matchPrediction.isOpen}
                onClose={matchPrediction.closeModal}
                prediction={matchPrediction.prediction}
                isLoading={matchPrediction.isLoading}
            />
        </Card>
    )
}

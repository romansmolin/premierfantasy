'use client'

import Link from 'next/link'
import useSWR from 'swr'

import { FormChart } from '@/widgets/player-stats'

import { MAX_COMPARE, MIN_COMPARE, scoutService } from '@/entities/scout'

import { ApiError } from '@/shared/api/api-error'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { formatPrice } from '@/shared/utils/format-stats'

import { CompareTable } from './compare-table'
import { RadarChart } from './radar-chart'
import { XptsAheadChart } from './xpts-ahead-chart'

function Message({ children }: { children: string }) {
    return (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{children}</p>
            <Link href="/scout" className="text-sm underline underline-offset-4">
                ← Back to players
            </Link>
        </div>
    )
}

export function ScoutCompareView({ ids }: { ids: string }) {
    const list = ids.split(',').filter(Boolean)
    const valid = list.length >= MIN_COMPARE && list.length <= MAX_COMPARE
    const { data, error, isLoading } = useSWR(
        valid ? ['scout-compare', ids] : null,
        () => scoutService.compare(list),
        { revalidateOnFocus: false },
    )

    if (!valid)
        return <Message>{`Pick ${MIN_COMPARE}–${MAX_COMPARE} players of one position to compare.`}</Message>

    if (isLoading) return <Skeleton className="h-96 w-full" />

    if (error || !data) {
        return (
            <Message>
                {ApiError.isApiError(error) && error.status < 500
                    ? error.message
                    : 'Could not compare the players. Try again later.'}
            </Message>
        )
    }

    const { players, position } = data

    return (
        <div className="space-y-6">
            <Link href="/scout" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                ← Back to players
            </Link>
            <h1 className="font-heading text-3xl font-semibold">Compare {position} players</h1>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {players.map(({ profile }) => {
                    const a = profile.player.availability
                    const news = a && a.status !== 'a' ? a : null

                    return (
                        <Card key={profile.player.id}>
                            <CardHeader>
                                <CardTitle>
                                    <Link
                                        href={`/scout/${profile.player.id}`}
                                        className="underline-offset-4 hover:underline"
                                    >
                                        {profile.player.name}
                                    </Link>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                    {profile.player.club.name} · {formatPrice(profile.player.price)}
                                </p>
                                {news && (
                                    <Badge variant="outline">
                                        {news.status === 'd' ? 'Doubtful' : 'Unavailable'}
                                        {news.chanceOfPlaying !== null ? ` (${news.chanceOfPlaying}%)` : ''}
                                    </Badge>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <RadarChart series={players.map((p) => ({ name: p.profile.player.name, radar: p.radar }))} />

            <Card>
                <CardHeader>
                    <CardTitle>Side by side</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <CompareTable players={players} />
                    <p className="text-xs text-muted-foreground">
                        ★ marks the best value in a row. Price and minutes are not rated. — means no fresh
                        price, no data, or a forecast that is switched off. Chances and expected points are
                        forecasts for the next match; the rest are facts.
                    </p>
                </CardContent>
            </Card>

            <XptsAheadChart players={players} />

            <div className="grid gap-4 lg:grid-cols-2">
                {players.map(({ profile }) => (
                    <div key={profile.player.id} className="space-y-2">
                        <h2 className="font-heading text-lg font-semibold">{profile.player.name}</h2>
                        <FormChart matches={profile.facts.form} />
                    </div>
                ))}
            </div>
        </div>
    )
}

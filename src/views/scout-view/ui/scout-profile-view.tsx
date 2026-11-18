'use client'

import Link from 'next/link'
import useSWR from 'swr'

import { FormChart, MinutesChart, ProbabilityCard } from '@/widgets/player-stats'

import { PlayerAiAnalysis } from '@/features/ai'

import { scoutService } from '@/entities/scout'

import { ApiError } from '@/shared/api/api-error'
import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { formatDate, formatPoints, formatPrice } from '@/shared/utils/format-stats'

import { RadarChart } from './radar-chart'
import { ValueAndXgChart } from './value-and-xg-chart'

export function ScoutProfileView({ id }: { id: string }) {
    const { data, error, isLoading } = useSWR(['scout-profile', id], () => scoutService.getProfile(id), {
        revalidateOnFocus: false,
    })

    if (isLoading) return <Skeleton className="h-96 w-full" />

    if (error || !data) {
        const missing = ApiError.isApiError(error) && error.status === 404

        return (
            <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    {missing ? 'Player not found.' : 'Could not load the player. Try again later.'}
                </p>
                <Link href="/scout" className="text-sm underline underline-offset-4">
                    ← All players
                </Link>
            </div>
        )
    }

    const { profile, radar, value } = data
    const { player, totals } = profile
    const news = player.availability && player.availability.status !== 'a' ? player.availability : null

    return (
        <div className="space-y-6">
            <Link href="/scout" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                ← All players
            </Link>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                    <h1 className="font-heading text-3xl font-semibold">{player.name}</h1>
                    <p className="text-sm text-muted-foreground">
                        {player.club.name} · {player.position} · {formatPrice(player.price)}
                    </p>
                    {news && (
                        <Badge variant="outline">
                            {news.status === 'd' ? 'Doubtful' : 'Unavailable'}
                            {news.chanceOfPlaying !== null ? ` (${news.chanceOfPlaying}%)` : ''}
                            {news.news ? `: ${news.news}` : ''}
                        </Badge>
                    )}
                </div>
                <Link href={`/scout?with=${player.id}`} className={buttonVariants({ variant: 'outline' })}>
                    Compare with…
                </Link>
            </div>

            <ProbabilityCard card={profile.probabilities} />

            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <h2 className="font-heading text-xl font-semibold">Facts</h2>
                    <Badge variant="outline">Fact</Badge>
                </div>

                <Card>
                    <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
                        {[
                            [
                                'Points per £m',
                                value.pointsPerMillion === null ? '—' : value.pointsPerMillion.toFixed(2),
                            ],
                            [
                                'Value rank in position',
                                value.rank === null ? '—' : `${value.rank} of ${value.of}`,
                            ],
                            ['Season points', String(value.points)],
                            ['Form (last 5)', formatPoints(profile.form)],
                        ].map(([label, v]) => (
                            <div key={label}>
                                <p className="text-2xl font-semibold">{v}</p>
                                <p className="text-xs text-muted-foreground">{label}</p>
                            </div>
                        ))}
                    </CardContent>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Points are calculated by FPL rules without bonus points. Points per £m needs a
                            fresh price; rank 1 is the best value among players of the same position.
                        </p>
                    </CardContent>
                </Card>

                <RadarChart series={[{ name: player.name, radar }]} />
                <ValueAndXgChart data={data} />
                <FormChart matches={profile.facts.form} />
                <MinutesChart matches={profile.facts.form} />

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                        ['Appearances', totals.appearances],
                        ['Minutes', totals.minutes],
                        ['Goals', totals.goals],
                        ['Assists', totals.assists],
                        ['Shots', totals.shots],
                        ['Key passes', totals.keyPasses],
                        ['Tackles', totals.tackles],
                        ['Yellow cards', totals.yellowCards],
                    ].map(([label, v]) => (
                        <Card key={label}>
                            <CardContent className="pt-6">
                                <p className="text-2xl font-semibold">{v}</p>
                                <p className="text-xs text-muted-foreground">{label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent matches</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {profile.recent.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No matches played this season yet.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Opponent</TableHead>
                                        <TableHead className="text-right">Min</TableHead>
                                        <TableHead className="text-right">G</TableHead>
                                        <TableHead className="text-right">A</TableHead>
                                        <TableHead className="text-right">Pts</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {profile.recent.map((m) => (
                                        <TableRow key={m.fixtureId}>
                                            <TableCell>{formatDate(m.kickoff)}</TableCell>
                                            <TableCell>
                                                {m.isHome ? 'vs' : 'at'} {m.opponentName}
                                            </TableCell>
                                            <TableCell className="text-right">{m.minutes}</TableCell>
                                            <TableCell className="text-right">{m.goals}</TableCell>
                                            <TableCell className="text-right">{m.assists}</TableCell>
                                            <TableCell className="text-right">{m.points}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </section>

            <PlayerAiAnalysis playerExternalId={player.externalId} />
        </div>
    )
}

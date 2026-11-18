import Link from 'next/link'

import { FormChart, MinutesChart, ProbabilityCard } from '@/widgets/player-stats'

import { PlayerAiAnalysis } from '@/features/ai'

import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { formatDate, formatPoints, formatPrice } from '@/shared/utils/format-stats'

import type { PlayerProfile } from '@/server/stats/service/stats.service.interface'

export function PlayerProfileView({ profile }: { profile: PlayerProfile }) {
    const { player, totals } = profile
    const news = player.availability && player.availability.status !== 'a' ? player.availability : null

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
            <Link
                href="/players"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
                ← All players
            </Link>
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

            <ProbabilityCard card={profile.probabilities} />

            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <h2 className="font-heading text-xl font-semibold">Facts</h2>
                    <Badge variant="outline">Fact</Badge>
                </div>
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
                        ['Form (last 5)', formatPoints(profile.form)],
                    ].map(([label, value]) => (
                        <Card key={label}>
                            <CardContent className="pt-6">
                                <p className="text-2xl font-semibold">{value}</p>
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
                        <p className="mt-3 text-xs text-muted-foreground">
                            Points are calculated by FPL rules without bonus points.
                        </p>
                    </CardContent>
                </Card>
            </section>

            <PlayerAiAnalysis playerExternalId={player.externalId} />
        </div>
    )
}

import Link from 'next/link'

import { Badge } from '@/shared/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

import { cellValue, heatShade, type HeatmapMetric } from './heatmap-data'

import type { IStatsService } from '@/server/stats/service/stats.service.interface'

type Heatmap = Awaited<ReturnType<IStatsService['getHeatmap']>>

const METRICS: { value: HeatmapMetric; label: string; href: string; meaning: string }[] = [
    {
        value: 'xg',
        label: 'Expected goals',
        href: '/fixtures',
        meaning: 'Expected goals scored by the club in that match',
    },
    {
        value: 'cs',
        label: 'Clean sheet',
        href: '/fixtures?metric=cs',
        meaning: 'Chance the club keeps a clean sheet',
    },
]

const HowWeCalculate = () => (
    <Link href="/how-we-calculate" className="underline underline-offset-4 hover:text-foreground">
        How we calculate
    </Link>
)

/** Next-8-gameweeks grid, clubs by rows; the number is always printed, the shade is secondary. */
export function FixtureHeatmap({ data, metric }: { data: Heatmap; metric: HeatmapMetric }) {
    if (!data.clubs.some((c) => c.cells.some((cell) => cell.matches.length > 0))) {
        return (
            <p className="text-sm text-muted-foreground">
                Forecasts are not available yet. See <HowWeCalculate />.
            </p>
        )
    }

    const active = METRICS.find((m) => m.value === metric) ?? METRICS[0]

    return (
        <section aria-labelledby="heatmap-title" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="heatmap-title" className="flex items-center gap-2 text-lg font-semibold">
                    Fixture difficulty
                    <Badge variant="secondary">Forecast</Badge>
                </h2>
                <nav aria-label="Heatmap metric" className="flex gap-2 text-sm">
                    {METRICS.map((m) => (
                        <Link
                            key={m.value}
                            href={m.href}
                            aria-current={m.value === active.value ? 'page' : undefined}
                            className="rounded-md border border-border px-3 py-1.5 aria-[current=page]:border-primary aria-[current=page]:bg-secondary aria-[current=page]:font-medium"
                        >
                            {m.label}
                        </Link>
                    ))}
                </nav>
            </div>
            <p className="text-sm text-muted-foreground">
                {active.meaning}. H = home, A = away. This is a forecast, not a fact: <HowWeCalculate />.
            </p>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead scope="col" className="sticky left-0 z-10 w-24 bg-card sm:w-auto">
                            Club
                        </TableHead>
                        {data.events.map((e) => (
                            <TableHead key={e} scope="col" className="text-center">
                                GW{e}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.clubs.map((club) => (
                        <TableRow key={club.clubId}>
                            <TableHead
                                scope="row"
                                className="sticky left-0 z-10 w-24 bg-card font-medium whitespace-normal sm:w-auto sm:whitespace-nowrap"
                            >
                                {club.name}
                            </TableHead>
                            {club.cells.map((cell) => (
                                <TableCell key={cell.event} className="p-1 text-center align-middle">
                                    {cell.matches.length === 0 ? (
                                        <span
                                            title={cell.hidden ? 'No forecast' : 'No match'}
                                            className="text-muted-foreground"
                                        >
                                            <span aria-hidden="true">–</span>
                                            <span className="sr-only">
                                                {cell.hidden
                                                    ? 'No forecast for this match (switched off or not enough data)'
                                                    : 'No match'}
                                            </span>
                                        </span>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            {cell.matches.map((match, i) => (
                                                <div
                                                    key={i}
                                                    className="rounded px-2 py-1 tabular-nums whitespace-nowrap"
                                                    style={heatShade(
                                                        metric === 'xg' ? match.xgFor : match.pCleanSheet,
                                                        metric,
                                                    )}
                                                    title={`${match.isHome ? 'Home' : 'Away'} v ${match.opponent}`}
                                                >
                                                    {cellValue(match, metric)}{' '}
                                                    <span className="text-xs text-foreground">
                                                        {match.isHome ? 'H' : 'A'}
                                                        <span className="sr-only"> v {match.opponent}</span>
                                                    </span>
                                                </div>
                                            ))}
                                            {cell.hidden && (
                                                <span
                                                    title="Another match has no forecast"
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    <span aria-hidden="true">+ hidden</span>
                                                    <span className="sr-only">
                                                        another match has no forecast
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </section>
    )
}

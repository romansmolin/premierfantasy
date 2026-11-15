import Link from 'next/link'

import { Badge } from '@/shared/ui/badge'
import { Card, CardContent } from '@/shared/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

import { formatPoints, formatPrice } from './format'

import type { PlayerListResult, PlayerSort } from '@/server/stats/service/stats.service.interface'

interface Props {
    data: PlayerListResult
    params: { position?: string; club?: string; q?: string }
}

const SORTS: { value: PlayerSort; label: string }[] = [
    { value: 'forecast', label: 'Forecast' },
    { value: 'form', label: 'Form' },
    { value: 'price', label: 'Price' },
    { value: 'minutes', label: 'Minutes' },
    { value: 'goals', label: 'Goals' },
    { value: 'assists', label: 'Assists' },
    { value: 'name', label: 'Name' },
]

const POSITIONS = ['GK', 'DEF', 'MID', 'FWD']

function pageHref(params: Props['params'], sort: PlayerSort, page: number): string {
    const search = new URLSearchParams()

    if (params.position) search.set('position', params.position)

    if (params.club) search.set('club', params.club)

    if (params.q) search.set('q', params.q)

    search.set('sort', sort)
    search.set('page', String(page))

    return `/players?${search.toString()}`
}

export function PlayersListView({ data, params }: Props) {
    const pages = Math.max(1, Math.ceil(data.total / data.pageSize))

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
            <div className="space-y-2">
                <h1 className="font-heading text-3xl font-semibold">Premier League players</h1>
                <p className="text-sm text-muted-foreground">
                    Season statistics, form and prices for fantasy football planning.
                    {data.forecastEnabled
                        ? ` Forecast = expected FPL points for gameweek ${data.nextEvent}.`
                        : ' The points forecast is switched off until it beats a simple baseline: see How we calculate.'}
                </p>
            </div>

            <form method="get" action="/players" className="flex flex-wrap items-end gap-3 text-sm">
                <label className="flex flex-col gap-1">
                    Search
                    <input
                        name="q"
                        defaultValue={params.q ?? ''}
                        className="h-9 rounded-md border bg-background px-2"
                        placeholder="Name"
                    />
                </label>
                <label className="flex flex-col gap-1">
                    Position
                    <select
                        name="position"
                        defaultValue={params.position ?? ''}
                        className="h-9 rounded-md border bg-background px-2"
                    >
                        <option value="">All</option>
                        {POSITIONS.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1">
                    Club
                    <select
                        name="club"
                        defaultValue={params.club ?? ''}
                        className="h-9 rounded-md border bg-background px-2"
                    >
                        <option value="">All</option>
                        {data.clubs.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1">
                    Sort by
                    <select
                        name="sort"
                        defaultValue={data.sort}
                        className="h-9 rounded-md border bg-background px-2"
                    >
                        {SORTS.filter((s) => s.value !== 'forecast' || data.forecastEnabled).map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </label>
                <button type="submit" className="h-9 rounded-md bg-primary px-4 text-primary-foreground">
                    Apply
                </button>
            </form>

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Player</TableHead>
                                <TableHead>Club</TableHead>
                                <TableHead>Pos</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Min</TableHead>
                                <TableHead className="text-right">G</TableHead>
                                <TableHead className="text-right">A</TableHead>
                                <TableHead className="text-right">Form</TableHead>
                                {data.forecastEnabled && (
                                    <TableHead className="text-right">GW{data.nextEvent}</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.items.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">
                                        <Link
                                            href={`/players/${p.id}`}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {p.name}
                                        </Link>
                                        {p.availability && p.availability.status !== 'a' && (
                                            <Badge variant="outline" className="ml-2">
                                                {p.availability.status === 'd' ? 'Doubt' : 'Out'}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{p.club.name}</TableCell>
                                    <TableCell>{p.position}</TableCell>
                                    <TableCell className="text-right">{formatPrice(p.price)}</TableCell>
                                    <TableCell className="text-right">{p.minutes}</TableCell>
                                    <TableCell className="text-right">{p.goals}</TableCell>
                                    <TableCell className="text-right">{p.assists}</TableCell>
                                    <TableCell className="text-right">{formatPoints(p.form)}</TableCell>
                                    {data.forecastEnabled && (
                                        <TableCell className="text-right font-medium">
                                            {formatPoints(p.forecast)}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {data.items.length === 0 && (
                        <p className="py-6 text-sm text-muted-foreground">No players match.</p>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                    {data.total} players · page {data.page} of {pages}
                </span>
                <div className="flex gap-3">
                    {data.page > 1 && (
                        <Link href={pageHref(params, data.sort, data.page - 1)}>← Previous</Link>
                    )}
                    {data.page < pages && (
                        <Link href={pageHref(params, data.sort, data.page + 1)}>Next →</Link>
                    )}
                </div>
            </div>
        </div>
    )
}

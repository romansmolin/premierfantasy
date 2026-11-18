import Link from 'next/link'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { SelectField } from '@/shared/ui/select-field'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { formatChance } from '@/shared/utils/format-chance'

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
    { value: 'pGoal', label: 'Goal chance' },
    { value: 'pAssist', label: 'Assist chance' },
    { value: 'pStart', label: 'Start chance' },
    { value: 'name', label: 'Name' },
]

const CHANCE_SORTS: PlayerSort[] = ['pGoal', 'pAssist', 'pStart']

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

function Chance({ value }: { value: number | null | undefined }) {
    if (value == null) return <span title="Switched off or not enough data">—</span>

    return <>{formatChance(value)}</>
}

export function PlayersListView({ data, params }: Props) {
    const pages = Math.max(1, Math.ceil(data.total / data.pageSize))
    const chancesOn = data.items.some((p) => p.next !== null) || CHANCE_SORTS.includes(data.sort)
    const hasDash = data.items.some(
        (p) => p.next === null || p.next.pGoal === null || p.next.pAssist === null || p.next.pStart === null,
    )

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
                <label className="flex flex-col gap-1.5">
                    Search
                    <Input
                        name="q"
                        defaultValue={params.q ?? ''}
                        className="h-10 w-52 px-3 text-sm"
                        placeholder="Name"
                    />
                </label>
                <div className="flex flex-col gap-1.5">
                    Position
                    <SelectField
                        name="position"
                        aria-label="Position"
                        defaultValue={params.position ?? ''}
                        className="w-28"
                        options={[
                            { value: '', label: 'All' },
                            ...POSITIONS.map((p) => ({ value: p, label: p })),
                        ]}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    Club
                    <SelectField
                        name="club"
                        aria-label="Club"
                        defaultValue={params.club ?? ''}
                        className="w-52"
                        options={[
                            { value: '', label: 'All' },
                            ...data.clubs.map((c) => ({ value: c.id, label: c.name })),
                        ]}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    Sort by
                    <SelectField
                        name="sort"
                        aria-label="Sort by"
                        defaultValue={data.sort}
                        className="w-40"
                        options={SORTS.filter(
                            (s) =>
                                (s.value !== 'forecast' || data.forecastEnabled) &&
                                (chancesOn || !CHANCE_SORTS.includes(s.value)),
                        )}
                    />
                </div>
                <Button type="submit" className="px-5">
                    Apply
                </Button>
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
                                <TableHead className="text-right">Goal %</TableHead>
                                <TableHead className="text-right">Assist %</TableHead>
                                <TableHead className="text-right">Start %</TableHead>
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
                                    <TableCell className="text-right tabular-nums">
                                        <Chance value={p.next?.pGoal} />
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        <Chance value={p.next?.pAssist} />
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        <Chance value={p.next?.pStart} />
                                    </TableCell>
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
                    {hasDash && (
                        <p className="pt-4 text-xs text-muted-foreground">
                            Goal %, Assist % and Start % are forecasts for the next match. — means this number
                            is switched off or there is not enough data; see{' '}
                            <Link
                                href="/how-we-calculate"
                                className="underline underline-offset-4 hover:text-foreground"
                            >
                                How we calculate
                            </Link>
                            .
                        </p>
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

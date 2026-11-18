'use client'

import { UserGroupIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import useSWR from 'swr'

import { canCompare, scoutService } from '@/entities/scout'
import type { ScoutListItem } from '@/entities/scout'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Checkbox } from '@/shared/ui/checkbox'
import { Input } from '@/shared/ui/input'
import { SelectField } from '@/shared/ui/select-field'
import { Skeleton } from '@/shared/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { formatChance } from '@/shared/utils/format-chance'
import { formatPoints, formatPrice } from '@/shared/utils/format-stats'

import { queryPlayers } from '../model/players-query'

import { CompareTray } from './compare-tray'

import type { TrayPlayer } from './compare-tray'
import type { ScoutFilters, ScoutSort } from '../model/players-query'
import type { Position } from '@/server/prediction/lib/scoring-rules'

const PAGE_SIZE = 50
const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD']
const PRICE_CAPS = [5, 6, 7, 8, 10, 12]

const SORTS: { value: ScoutSort; label: string }[] = [
    { value: 'forecast', label: 'Forecast' },
    { value: 'form', label: 'Form' },
    { value: 'value', label: 'Points per £m' },
    { value: 'price', label: 'Price' },
    { value: 'minutes', label: 'Minutes' },
    { value: 'goals', label: 'Goals' },
    { value: 'assists', label: 'Assists' },
    { value: 'pGoal', label: 'Goal chance' },
    { value: 'pAssist', label: 'Assist chance' },
    { value: 'pStart', label: 'Start chance' },
    { value: 'name', label: 'Name' },
]

const MISSING = 'Switched off, not enough data, or no match'

function Chance({ value }: { value: number | null | undefined }) {
    if (value == null) {
        return (
            <span title={MISSING}>
                <span aria-hidden="true">—</span>
                <span className="sr-only">{MISSING}</span>
            </span>
        )
    }

    return <>{formatChance(value)}</>
}

/** `withId`: a player to start the comparison with, as sent by the profile page. */
export function ScoutListView({ withId }: { withId?: string }) {
    const { data, error, isLoading } = useSWR('scout-list', () => scoutService.getList(), {
        revalidateOnFocus: false,
    })
    const [own, setOwn] = useState<Omit<ScoutFilters, 'position'>>({
        q: '',
        clubId: '',
        maxPrice: null,
        sort: 'form',
    })
    // null = untouched: follow the player the profile page sent us with.
    const [positionChoice, setPositionChoice] = useState<Position | '' | null>(null)
    const [page, setPage] = useState(1)
    const [picked, setPicked] = useState<TrayPlayer[] | null>(null)
    const [notice, setNotice] = useState<string | null>(null)

    const start = data?.items.find((p) => p.id === withId)
    const selected: TrayPlayer[] =
        picked ?? (start ? [{ id: start.id, name: start.name, position: start.position }] : [])
    const setSelected = (next: (current: TrayPlayer[]) => TrayPlayer[]) => setPicked(next(selected))
    const position = positionChoice ?? start?.position ?? ''
    const filters = useMemo<ScoutFilters>(() => ({ ...own, position }), [own, position])

    const filtered = useMemo(() => queryPlayers(data?.items ?? [], filters), [data, filters])
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const visible = filtered.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE)

    const update = ({ position, ...patch }: Partial<ScoutFilters>) => {
        if (position !== undefined) setPositionChoice(position)

        setOwn((current) => ({ ...current, ...patch }))
        setPage(1)
    }

    const toggle = (p: ScoutListItem, on: boolean) => {
        if (!on) {
            setSelected((s) => s.filter((x) => x.id !== p.id))
            setNotice(null)

            return
        }

        const check = canCompare(selected, p)

        if (!check.ok) {
            setNotice(check.reason)

            return
        }

        setNotice(null)
        setSelected((s) => [...s, { id: p.id, name: p.name, position: p.position }])
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <HugeiconsIcon icon={UserGroupIcon} size={20} className="text-primary" />
                </div>
                <div>
                    <h2 className="text-lg font-bold">Scout players</h2>
                    <p className="text-sm text-muted-foreground">
                        Tick up to 3 players of one position and compare them side by side.
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 text-sm">
                <label className="flex flex-col gap-1.5">
                    Search
                    <Input
                        value={filters.q}
                        onChange={(e) => update({ q: e.target.value })}
                        className="h-10 w-52 px-3 text-sm"
                        placeholder="Name"
                    />
                </label>
                <div className="flex flex-col gap-1.5">
                    Position
                    <SelectField
                        aria-label="Position"
                        value={filters.position}
                        onValueChange={(v) => update({ position: v as Position | '' })}
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
                        aria-label="Club"
                        value={filters.clubId}
                        onValueChange={(v) => update({ clubId: v })}
                        className="w-48"
                        options={[
                            { value: '', label: 'All' },
                            ...(data?.clubs ?? []).map((c) => ({ value: c.id, label: c.name })),
                        ]}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    Price
                    <SelectField
                        aria-label="Price"
                        value={filters.maxPrice === null ? '' : String(filters.maxPrice)}
                        onValueChange={(v) => update({ maxPrice: v === '' ? null : Number(v) })}
                        className="w-32"
                        options={[
                            { value: '', label: 'Any' },
                            ...PRICE_CAPS.map((c) => ({ value: String(c), label: `up to £${c}.0m` })),
                        ]}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    Sort by
                    <SelectField
                        aria-label="Sort by"
                        value={filters.sort}
                        onValueChange={(v) => update({ sort: v as ScoutSort })}
                        className="w-40"
                        options={SORTS.filter(
                            (s) => s.value !== 'forecast' || data?.forecastEnabled !== false,
                        )}
                    />
                </div>
            </div>

            {error && <p className="text-sm text-destructive">Could not load players. Try again later.</p>}
            {notice && (
                <p role="status" className="text-sm text-amber-400">
                    {notice}
                </p>
            )}

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <Skeleton className="h-96 w-full" />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <span className="sr-only">Compare</span>
                                    </TableHead>
                                    <TableHead>Player</TableHead>
                                    <TableHead>Club</TableHead>
                                    <TableHead>Pos</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Form</TableHead>
                                    <TableHead className="text-right">Pts / £m</TableHead>
                                    <TableHead className="text-right">G</TableHead>
                                    <TableHead className="text-right">A</TableHead>
                                    <TableHead className="text-right">Goal %</TableHead>
                                    <TableHead className="text-right">Assist %</TableHead>
                                    <TableHead className="text-right">Start %</TableHead>
                                    {data?.forecastEnabled && (
                                        <TableHead className="text-right">GW{data.nextEvent}</TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visible.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <Checkbox
                                                aria-label={`Compare ${p.name}`}
                                                checked={selected.some((s) => s.id === p.id)}
                                                onCheckedChange={(on) => toggle(p, on)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/scout/${p.id}`}
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
                                        <TableCell className="text-right">{formatPoints(p.form)}</TableCell>
                                        <TableCell className="text-right">
                                            {p.pointsPerMillion === null
                                                ? '—'
                                                : p.pointsPerMillion.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">{p.goals}</TableCell>
                                        <TableCell className="text-right">{p.assists}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            <Chance value={p.next?.pGoal} />
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            <Chance value={p.next?.pAssist} />
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            <Chance value={p.next?.pStart} />
                                        </TableCell>
                                        {data?.forecastEnabled && (
                                            <TableCell className="text-right font-medium">
                                                {formatPoints(p.forecast)}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {!isLoading && filtered.length === 0 && (
                        <p className="py-6 text-sm text-muted-foreground">No players match.</p>
                    )}
                    <p className="pt-4 text-xs text-muted-foreground">
                        Pts / £m = calculated season points (no bonus) per £m. Goal %, Assist % and Start %
                        are forecasts for the next match. — means no fresh price, no match, not enough data,
                        or the number is switched off until it beats a baseline.
                    </p>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                    {filtered.length} players · page {Math.min(page, pages)} of {pages}
                </span>
                <div className="flex gap-2">
                    <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        Previous
                    </Button>
                    <Button variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                        Next
                    </Button>
                </div>
            </div>

            <CompareTray
                players={selected}
                onRemove={(id) => setSelected((s) => s.filter((x) => x.id !== id))}
                onClear={() => {
                    setPicked([])
                    setNotice(null)
                }}
            />
        </div>
    )
}

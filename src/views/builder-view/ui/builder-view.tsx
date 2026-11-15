'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'

import { squadService, validateSquad } from '@/entities/squad'
import type { PoolPlayer, Position, SavedSquad, SquadPlayerInfo } from '@/entities/squad'

import { ApiError } from '@/shared/api/api-error'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD']
const price = (tenths: number | null) => (tenths === null ? '—' : `£${(tenths / 10).toFixed(1)}m`)
const pts = (n: number | null) => (n === null ? '—' : n.toFixed(1))

export function BuilderView() {
    const { data: pool, isLoading } = useSWR('builder-pool', () => squadService.getPool())
    const { data: saved, mutate: reloadSaved } = useSWR('squads', () => squadService.list())
    const [starters, setStarters] = useState<string[]>([])
    const [bench, setBench] = useState<string[]>([])
    const [captainId, setCaptainId] = useState('')
    const [viceCaptainId, setViceCaptainId] = useState('')
    const [name, setName] = useState('My squad')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [filters, setFilters] = useState({ position: '', club: '', q: '', sort: 'forecast' })

    const byId = useMemo(() => new Map((pool?.players ?? []).map((p) => [p.id, p])), [pool])
    const infos = useMemo(
        () =>
            new Map<string, SquadPlayerInfo>(
                (pool?.players ?? []).map((p) => [
                    p.id,
                    { playerId: p.id, position: p.position, clubId: p.clubId, priceTenths: p.priceTenths },
                ]),
            ),
        [pool],
    )

    if (isLoading || !pool) return <Skeleton className="h-96 rounded-xl" />

    const rules = pool.rules
    const chosen = [...starters, ...bench]
    const players = chosen.map((id) => byId.get(id)).filter((p): p is PoolPlayer => Boolean(p))
    const complete = chosen.length === rules.squadSize
    const validation = validateSquad({ starters, bench, captainId, viceCaptainId }, infos, rules)
    const spent = players.reduce((sum, p) => sum + (p.priceTenths ?? 0), 0)
    const unpriced = players.some((p) => p.priceTenths === null)
    const xiPoints = pool.forecastEnabled
        ? starters.reduce((sum, id) => sum + (byId.get(id)?.forecast ?? 0), 0) +
          (byId.get(captainId)?.forecast ?? 0)
        : null

    const countOf = (position: Position, ids: string[]) =>
        ids.filter((id) => byId.get(id)?.position === position).length

    const add = (p: PoolPlayer) => {
        if (chosen.includes(p.id)) return

        if (countOf(p.position, chosen) >= rules.positions[p.position].squadSelect) {
            toast.error(`You already have ${rules.positions[p.position].squadSelect} ${p.position}`)

            return
        }

        if (chosen.filter((id) => byId.get(id)?.clubId === p.clubId).length >= rules.teamLimit) {
            toast.error(`At most ${rules.teamLimit} players from ${p.clubName}`)

            return
        }

        const room =
            starters.length < rules.startingSize &&
            countOf(p.position, starters) < rules.positions[p.position].maxPlay

        if (room) setStarters([...starters, p.id])
        else if (bench.length < rules.squadSize - rules.startingSize) setBench([...bench, p.id])
        else toast.error('The squad is full: remove a player first')
    }

    const remove = (id: string) => {
        setStarters(starters.filter((x) => x !== id))
        setBench(bench.filter((x) => x !== id))

        if (captainId === id) setCaptainId('')

        if (viceCaptainId === id) setViceCaptainId('')
    }

    const toBench = (id: string) => {
        setStarters(starters.filter((x) => x !== id))
        setBench([...bench, id])

        if (captainId === id) setCaptainId('')

        if (viceCaptainId === id) setViceCaptainId('')
    }

    const toStart = (id: string) => {
        if (starters.length >= rules.startingSize)
            return toast.error('The starting XI is full: move someone to the bench first')

        const p = byId.get(id)

        if (p && countOf(p.position, starters) >= rules.positions[p.position].maxPlay) {
            return toast.error(`At most ${rules.positions[p.position].maxPlay} ${p.position} can start`)
        }

        setBench(bench.filter((x) => x !== id))
        setStarters([...starters, id])
    }

    const load = (s: SavedSquad) => {
        setStarters(s.starters)
        setBench(s.bench)
        setCaptainId(s.captainId)
        setViceCaptainId(s.viceCaptainId)
        setName(s.name)
        setEditingId(s.id)
    }

    const reset = () => {
        setStarters([])
        setBench([])
        setCaptainId('')
        setViceCaptainId('')
        setEditingId(null)
    }

    const save = async () => {
        const input = { name, starters, bench, captainId, viceCaptainId }

        try {
            const result = editingId
                ? await squadService.update(editingId, input)
                : await squadService.create(input)

            setEditingId(result.id)
            await reloadSaved()
            toast.success('Squad saved')
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : 'Could not save the squad')
        }
    }

    const list = pool.players
        .filter((p) => !filters.position || p.position === filters.position)
        .filter((p) => !filters.club || p.clubId === filters.club)
        .filter((p) => !filters.q || p.name.toLowerCase().includes(filters.q.toLowerCase()))
        .sort((a, b) => {
            const key =
                filters.sort === 'price' ? 'priceTenths' : filters.sort === 'form' ? 'form' : 'forecast'
            const av = a[key] ?? -1
            const bv = b[key] ?? -1

            return bv - av
        })
        .slice(0, 60)
    const clubs = [...new Map(pool.players.map((p) => [p.clubId, p.clubName])).entries()].sort((a, b) =>
        a[1].localeCompare(b[1]),
    )

    const row = (id: string, isStarter: boolean) => {
        const p = byId.get(id)

        if (!p) return null

        return (
            <div key={id} className="flex items-center justify-between gap-2 border-b py-1.5 text-sm">
                <span className="min-w-0 truncate">
                    <Badge variant="outline" className="mr-2">
                        {p.position}
                    </Badge>
                    {p.name} <span className="text-xs text-muted-foreground">{p.clubName}</span>
                    {captainId === id && <Badge className="ml-2">C</Badge>}
                    {viceCaptainId === id && (
                        <Badge variant="secondary" className="ml-2">
                            V
                        </Badge>
                    )}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                    <span className="text-xs text-muted-foreground">{price(p.priceTenths)}</span>
                    {isStarter && (
                        <>
                            <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => setCaptainId(id === viceCaptainId ? '' : id)}
                            >
                                C
                            </Button>
                            <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => setViceCaptainId(id === captainId ? '' : id)}
                            >
                                V
                            </Button>
                        </>
                    )}
                    <Button
                        size="xs"
                        variant="outline"
                        onClick={() => (isStarter ? toBench(id) : toStart(id))}
                    >
                        {isStarter ? 'Bench' : 'Start'}
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => remove(id)}>
                        ✕
                    </Button>
                </span>
            </div>
        )
    }

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Your squad</CardTitle>
                        <CardDescription>
                            {chosen.length}/{rules.squadSize} players ·{' '}
                            {POSITIONS.map(
                                (p) => `${p} ${countOf(p, chosen)}/${rules.positions[p].squadSelect}`,
                            ).join(' · ')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2 text-sm">
                            <Badge variant="secondary">
                                Spent {price(spent)} of {price(rules.budgetTenths)}
                                {unpriced ? ' (some prices unknown)' : ''}
                            </Badge>
                            {validation.formation && starters.length === rules.startingSize && (
                                <Badge variant="outline">{validation.formation}</Badge>
                            )}
                            {xiPoints !== null && (
                                <Badge variant="outline">
                                    Forecast XI: {pts(xiPoints)} (captain doubled)
                                </Badge>
                            )}
                        </div>
                        <div>
                            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                                Starting XI
                            </p>
                            {starters.map((id) => row(id, true))}
                            {starters.length === 0 && (
                                <p className="text-sm text-muted-foreground">Add players from the list.</p>
                            )}
                        </div>
                        <div>
                            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                                Bench (in order)
                            </p>
                            {bench.map((id) => row(id, false))}
                        </div>
                        {complete && !validation.valid && (
                            <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
                                {validation.errors.map((e) => (
                                    <li key={e}>{e}</li>
                                ))}
                            </ul>
                        )}
                        {complete && validation.valid && (
                            <p className="text-sm text-green-600">
                                This squad follows the FPL rules. Enter it on the FPL site yourself.
                            </p>
                        )}
                        <div className="flex gap-2">
                            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
                            <Button onClick={save} disabled={!validation.valid || !name.trim()}>
                                {editingId ? 'Update' : 'Save'}
                            </Button>
                            <Button variant="outline" onClick={reset}>
                                New
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Saved squads</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {(saved ?? []).length === 0 && (
                            <p className="text-muted-foreground">Nothing saved yet.</p>
                        )}
                        {(saved ?? []).map((s) => (
                            <div
                                key={s.id}
                                className="flex items-center justify-between gap-2 border-b py-1.5"
                            >
                                <span>
                                    {s.name}
                                    {s.priceDriftTenths ? (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            prices {s.priceDriftTenths > 0 ? '+' : ''}
                                            {(s.priceDriftTenths / 10).toFixed(1)}m since saved
                                        </span>
                                    ) : null}
                                    {!s.validation.valid && (
                                        <Badge variant="outline" className="ml-2">
                                            needs a fix
                                        </Badge>
                                    )}
                                </span>
                                <span className="flex gap-1">
                                    <Button size="xs" variant="outline" onClick={() => load(s)}>
                                        Open
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        onClick={async () => {
                                            await squadService.remove(s.id)

                                            if (editingId === s.id) reset()

                                            await reloadSaved()
                                        }}
                                    >
                                        Delete
                                    </Button>
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Players</CardTitle>
                    <CardDescription>
                        {pool.forecastEnabled
                            ? `Forecast = expected FPL points in gameweek ${pool.nextEvent}.`
                            : 'Forecast is off until it beats the baseline.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-sm">
                        <Input
                            className="w-40"
                            placeholder="Search"
                            value={filters.q}
                            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                        />
                        <select
                            className="h-9 rounded-md border bg-background px-2"
                            value={filters.position}
                            onChange={(e) => setFilters({ ...filters, position: e.target.value })}
                        >
                            <option value="">All positions</option>
                            {POSITIONS.map((p) => (
                                <option key={p}>{p}</option>
                            ))}
                        </select>
                        <select
                            className="h-9 rounded-md border bg-background px-2"
                            value={filters.club}
                            onChange={(e) => setFilters({ ...filters, club: e.target.value })}
                        >
                            <option value="">All clubs</option>
                            {clubs.map(([id, clubName]) => (
                                <option key={id} value={id}>
                                    {clubName}
                                </option>
                            ))}
                        </select>
                        <select
                            className="h-9 rounded-md border bg-background px-2"
                            value={filters.sort}
                            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                        >
                            {pool.forecastEnabled && <option value="forecast">Forecast</option>}
                            <option value="form">Form</option>
                            <option value="price">Price</option>
                        </select>
                    </div>
                    <div className="max-h-[70vh] overflow-auto">
                        {list.map((p) => (
                            <div
                                key={p.id}
                                className="flex items-center justify-between gap-2 border-b py-1.5 text-sm"
                            >
                                <span className="min-w-0 truncate">
                                    <Badge variant="outline" className="mr-2">
                                        {p.position}
                                    </Badge>
                                    {p.name}{' '}
                                    <span className="text-xs text-muted-foreground">{p.clubName}</span>
                                    {p.availability && p.availability.status !== 'a' && (
                                        <Badge variant="outline" className="ml-2">
                                            {p.availability.status === 'd' ? 'Doubt' : 'Out'}
                                        </Badge>
                                    )}
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {price(p.priceTenths)} · form {pts(p.form)}
                                        {pool.forecastEnabled ? ` · ${pts(p.forecast)}` : ''}
                                    </span>
                                    <Button size="xs" disabled={chosen.includes(p.id)} onClick={() => add(p)}>
                                        Add
                                    </Button>
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

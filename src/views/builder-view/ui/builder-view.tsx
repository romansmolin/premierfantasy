'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'

import { SquadAiPanel } from '@/features/ai'

import {
    DEFAULT_FORMATION,
    formationFromStarters,
    formationLabel,
    formationOptions,
    slotsOf,
    squadService,
    validateSquad,
} from '@/entities/squad'
import type {
    AutoBuildResult,
    Formation,
    PoolPlayer,
    Position,
    SavedSquad,
    SquadPlayerInfo,
} from '@/entities/squad'

import { ApiError } from '@/shared/api/api-error'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'

import { Pitch } from './pitch'
import { POSITION_NAMES, priceLabel } from './player-card'
import { PlayerPicker } from './player-picker'

import type { Zone } from './pitch'
import type { ReactNode } from 'react'

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD']
/** Pitch rows are drawn from the attack down to the goalkeeper. */
const PITCH_ORDER: Position[] = ['FWD', 'MID', 'DEF', 'GK']

interface PickerTarget {
    zone: Zone
    /** The player this pick replaces; null when filling an empty slot. */
    replaceId: string | null
}

export function BuilderView() {
    const { data: pool, isLoading } = useSWR('builder-pool', () => squadService.getPool())
    const { data: saved, mutate: reloadSaved } = useSWR('squads', () => squadService.list())
    const [starters, setStarters] = useState<string[]>([])
    const [bench, setBench] = useState<string[]>([])
    const [formation, setFormation] = useState<Formation>(DEFAULT_FORMATION)
    const [captainId, setCaptainId] = useState('')
    const [viceCaptainId, setViceCaptainId] = useState('')
    const [name, setName] = useState('My squad')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [lockedIds, setLockedIds] = useState<string[]>([])
    const [excludedIds, setExcludedIds] = useState<string[]>([])
    const [picker, setPicker] = useState<PickerTarget | null>(null)

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
    const slots = slotsOf(formation)
    const benchSlots = rules.squadSize - rules.startingSize
    const chosen = [...starters, ...bench]
    const players = chosen.map((id) => byId.get(id)).filter((p): p is PoolPlayer => Boolean(p))
    const complete = chosen.length === rules.squadSize
    const validation = validateSquad({ starters, bench, captainId, viceCaptainId }, infos, rules)
    const spent = players.reduce((sum, p) => sum + (p.priceTenths ?? 0), 0)
    const unpriced = players.some((p) => p.priceTenths === null)
    const bank = rules.budgetTenths - spent
    const xiPoints = pool.forecastEnabled
        ? starters.reduce((sum, id) => sum + (byId.get(id)?.forecast ?? 0), 0) +
          (byId.get(captainId)?.forecast ?? 0)
        : null
    const options = formationOptions(rules)

    const positionOf = (id: string) => byId.get(id)?.position
    const countOf = (position: Position, ids: string[]) =>
        ids.filter((id) => positionOf(id) === position).length

    /** Puts the squad into a formation: players move between the XI and the bench to fit its rows. */
    const layout = (next: Formation, xi: string[], subs: string[]) => {
        const want = slotsOf(next)
        const everyone = [...xi, ...subs]
        const nextXi = POSITIONS.flatMap((p) =>
            everyone.filter((id) => positionOf(id) === p).slice(0, want[p]),
        )
        const inXi = new Set(nextXi)
        const nextBench = [...subs.filter((id) => !inXi.has(id)), ...xi.filter((id) => !inXi.has(id))]

        setFormation(next)
        setStarters(nextXi)
        setBench(nextBench)

        if (!inXi.has(captainId)) setCaptainId('')

        if (!inXi.has(viceCaptainId)) setViceCaptainId('')
    }

    const changeFormation = (label: string) => {
        const next = options.find((f) => formationLabel(f) === label)

        if (next) layout(next, starters, bench)
    }

    const remove = (id: string) => {
        setStarters(starters.filter((x) => x !== id))
        setBench(bench.filter((x) => x !== id))
        setLockedIds((ids) => ids.filter((x) => x !== id))

        if (captainId === id) setCaptainId('')

        if (viceCaptainId === id) setViceCaptainId('')
    }

    /** Making the vice-captain the captain hands the vice role to the old captain, so nobody ends up with no role by accident. */
    const makeCaptain = (id: string) => {
        if (id === captainId) return

        if (id === viceCaptainId) setViceCaptainId(captainId)

        setCaptainId(id)
    }

    const makeVice = (id: string) => {
        if (id === viceCaptainId) return

        if (id === captainId) setCaptainId(viceCaptainId)

        setViceCaptainId(id)
    }

    const swap = (a: string, b: string) => {
        const swapped = (ids: string[]) => ids.map((x) => (x === a ? b : x === b ? a : x))
        const nextXi = swapped(starters)

        setStarters(nextXi)
        setBench(swapped(bench))

        if (!nextXi.includes(captainId)) setCaptainId('')

        if (!nextXi.includes(viceCaptainId)) setViceCaptainId('')
    }

    const startFromBench = (id: string) => {
        setBench(bench.filter((x) => x !== id))
        setStarters([...starters, id])
    }

    const pick = (player: PoolPlayer) => {
        if (!picker) return

        const { zone, replaceId } = picker
        const put = (ids: string[]) =>
            replaceId ? ids.map((x) => (x === replaceId ? player.id : x)) : [...ids, player.id]

        if (replaceId) {
            if (captainId === replaceId) setCaptainId(player.id)

            if (viceCaptainId === replaceId) setViceCaptainId(player.id)

            setLockedIds((ids) => ids.filter((x) => x !== replaceId))
        }

        if (replaceId ? starters.includes(replaceId) : zone.zone === 'xi') setStarters(put(starters))
        else setBench(put(bench))

        setPicker(null)
    }

    const applyAutoBuild = (result: AutoBuildResult) => {
        setCaptainId(result.captainId)
        setViceCaptainId(result.viceCaptainId)
        setName('Auto-built squad')
        setEditingId(null)
        setFormation(formationFromStarters(result.starters, infos) ?? DEFAULT_FORMATION)
        setStarters(result.starters)
        setBench(result.bench)
    }

    const load = (s: SavedSquad) => {
        setLockedIds([])
        setCaptainId(s.captainId)
        setViceCaptainId(s.viceCaptainId)
        setName(s.name)
        setEditingId(s.id)
        setFormation(formationFromStarters(s.starters, infos) ?? DEFAULT_FORMATION)
        setStarters(s.starters)
        setBench(s.bench)
    }

    const reset = () => {
        setLockedIds([])
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

    const toggleLock = (id: string) =>
        setLockedIds(lockedIds.includes(id) ? lockedIds.filter((x) => x !== id) : [...lockedIds, id])

    const toggleExclude = (id: string) =>
        setExcludedIds(excludedIds.includes(id) ? excludedIds.filter((x) => x !== id) : [...excludedIds, id])

    // What the open picker may offer.
    const replaced = picker?.replaceId ? byId.get(picker.replaceId) : undefined
    const after = chosen.filter((id) => id !== picker?.replaceId)
    const benchRoom = (position: Position) =>
        rules.positions[position].squadSelect -
        slots[position] -
        countOf(
            position,
            bench.filter((id) => id !== picker?.replaceId),
        )
    const pickerPositions: Position[] = !picker
        ? []
        : replaced
          ? [replaced.position]
          : picker.zone.zone === 'xi'
            ? [picker.zone.position]
            : POSITIONS.filter((p) => countOf(p, after) < rules.positions[p].squadSelect && benchRoom(p) > 0)

    const reason = (p: PoolPlayer): string | null => {
        if (chosen.includes(p.id)) return 'In squad'

        if (countOf(p.position, after) >= rules.positions[p.position].squadSelect) return 'Position full'

        if (after.filter((id) => byId.get(id)?.clubId === p.clubId).length >= rules.teamLimit)
            return 'Club limit'

        return null
    }

    const cardMenu = (id: string, zone: 'xi' | 'bench', card: ReactNode) => {
        const p = byId.get(id)

        if (!p) return null

        const sameRow = (ids: string[]) => ids.filter((x) => x !== id && positionOf(x) === p.position)
        const swaps = zone === 'xi' ? sameRow(bench) : sameRow(starters)
        const canStart = zone === 'bench' && countOf(p.position, starters) < slots[p.position]

        return (
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <button
                            type="button"
                            aria-label={`${p.name}, open actions`}
                            className="rounded-t-xl rounded-b-[1.6rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        />
                    }
                >
                    {card}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60" align="center">
                    {zone === 'xi' && (
                        <>
                            <DropdownMenuItem onClick={() => makeCaptain(id)}>Make captain</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => makeVice(id)}>
                                Make vice-captain
                            </DropdownMenuItem>
                        </>
                    )}
                    {canStart && (
                        <DropdownMenuItem onClick={() => startFromBench(id)}>
                            Move to the starting XI
                        </DropdownMenuItem>
                    )}
                    {swaps.map((other) => (
                        <DropdownMenuItem key={other} onClick={() => swap(id, other)}>
                            Swap with {byId.get(other)?.name}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem
                        onClick={() =>
                            setPicker({
                                zone: zone === 'xi' ? { zone, position: p.position } : { zone },
                                replaceId: id,
                            })
                        }
                    >
                        Replace with another {POSITION_NAMES[p.position]}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleLock(id)}>
                        {lockedIds.includes(id) ? 'Unlock for auto-build' : 'Keep in auto-build'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => remove(id)}>
                        Remove from squad
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    const pitchRows = PITCH_ORDER.map((position) => ({
        position,
        slots: slots[position],
        ids: starters.filter((id) => positionOf(id) === position),
    }))
    const spentShare = Math.min(100, Math.round((spent / rules.budgetTenths) * 100))
    const pickerTitle = picker
        ? replaced
            ? `Replace ${replaced.name}`
            : picker.zone.zone === 'xi'
              ? `Pick a ${POSITION_NAMES[picker.zone.position]}`
              : 'Pick a substitute'
        : ''

    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="space-y-3">
                <div className="space-y-3 rounded-2xl border bg-card p-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Formation</span>
                            <Select
                                value={formationLabel(formation)}
                                onValueChange={(value) => value && changeFormation(value)}
                            >
                                <SelectTrigger
                                    aria-label="Formation"
                                    className="w-full text-sm font-semibold data-[size=default]:h-9"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.map((f) => (
                                        <SelectItem key={formationLabel(f)} value={formationLabel(f)}>
                                            {formationLabel(f)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Players</span>
                            <span className="text-lg font-semibold leading-9" data-testid="player-count">
                                {chosen.length}
                                <span className="text-sm font-normal text-muted-foreground">
                                    {' '}
                                    / {rules.squadSize}
                                </span>
                            </span>
                        </div>
                        <div className="flex flex-col gap-1" title="Captain counted twice">
                            <span className="text-xs text-muted-foreground">Expected XI points</span>
                            <span className="font-audiowide text-xl leading-9">
                                {xiPoints === null ? '—' : xiPoints.toFixed(1)}
                            </span>
                        </div>
                    </div>
                    <div>
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                            <span className="text-sm">
                                <span className="font-semibold">{priceLabel(spent)}</span>
                                <span className="text-muted-foreground">
                                    {' '}
                                    of {priceLabel(rules.budgetTenths)} spent
                                </span>
                                {unpriced && (
                                    <span className="text-muted-foreground">, a price is missing</span>
                                )}
                            </span>
                            <span
                                className={
                                    bank < 0
                                        ? 'whitespace-nowrap text-sm font-semibold text-destructive'
                                        : 'whitespace-nowrap text-sm text-muted-foreground'
                                }
                            >
                                {priceLabel(Math.abs(bank))} {bank < 0 ? 'over' : 'left'}
                            </span>
                        </div>
                        <div
                            className="h-2 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-label="Budget used"
                            aria-valuenow={spentShare}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div
                                className={bank < 0 ? 'h-full bg-destructive' : 'h-full bg-primary'}
                                style={{ width: `${spentShare}%` }}
                            />
                        </div>
                    </div>
                </div>

                <Pitch
                    rows={pitchRows}
                    bench={bench}
                    benchSlots={benchSlots}
                    players={byId}
                    captainId={captainId}
                    viceCaptainId={viceCaptainId}
                    lockedIds={lockedIds}
                    showForecast={pool.forecastEnabled}
                    onEmpty={(zone) => setPicker({ zone, replaceId: null })}
                    cardMenu={cardMenu}
                />
                {chosen.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground">
                        Tap an empty card to pick a player, or let auto-build make a squad for you.
                    </p>
                )}
            </div>

            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Your squad</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-4 gap-2">
                            {POSITIONS.map((p) => {
                                const have = countOf(p, chosen)
                                const need = rules.positions[p].squadSelect

                                return (
                                    <div
                                        key={p}
                                        className={
                                            have === need
                                                ? 'rounded-lg border border-green-600/50 bg-green-600/10 px-2 py-1.5 text-center'
                                                : 'rounded-lg border px-2 py-1.5 text-center'
                                        }
                                    >
                                        <div className="text-xs text-muted-foreground">{p}</div>
                                        <div className="text-sm font-semibold">
                                            {have}/{need}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="text-sm">
                            {complete && !validation.valid && (
                                <ul className="list-disc space-y-1 pl-5 text-destructive">
                                    {validation.errors.map((e) => (
                                        <li key={e}>{e}</li>
                                    ))}
                                </ul>
                            )}
                            {complete && validation.valid && (
                                <p className="font-medium text-green-600 dark:text-green-500">
                                    This squad follows the FPL rules. Enter it on the FPL site yourself.
                                </p>
                            )}
                            {!complete && (
                                <p>
                                    <span className="font-medium">
                                        {rules.squadSize - chosen.length} more players to go.
                                    </span>{' '}
                                    <span className="text-muted-foreground">
                                        Captain and vice-captain come from the XI. Tap a card to set them,
                                        swap or replace a player.
                                    </span>
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                className="h-10 flex-1 px-3 text-sm"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={60}
                                aria-label="Squad name"
                            />
                            <Button
                                className="px-4"
                                onClick={save}
                                disabled={!validation.valid || !name.trim()}
                            >
                                {editingId ? 'Update' : 'Save'}
                            </Button>
                            <Button className="px-4" variant="outline" onClick={reset}>
                                New
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <SquadAiPanel
                    players={byId}
                    lockedIds={lockedIds}
                    excludedIds={excludedIds}
                    onUnlock={(id) => setLockedIds(lockedIds.filter((x) => x !== id))}
                    onInclude={(id) => setExcludedIds(excludedIds.filter((x) => x !== id))}
                    onApply={applyAutoBuild}
                    savedSquadId={editingId}
                    forecastEnabled={pool.forecastEnabled}
                />

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

            {picker && pickerPositions.length > 0 && (
                <PlayerPicker
                    key={`${picker.zone.zone}-${picker.replaceId ?? 'new'}`}
                    open
                    onOpenChange={(open) => !open && setPicker(null)}
                    title={pickerTitle}
                    players={pool.players}
                    positions={pickerPositions}
                    reason={reason}
                    bankTenths={bank + (replaced?.priceTenths ?? 0)}
                    showForecast={pool.forecastEnabled}
                    excludedIds={excludedIds}
                    onToggleExclude={toggleExclude}
                    onPick={pick}
                />
            )}
        </div>
    )
}

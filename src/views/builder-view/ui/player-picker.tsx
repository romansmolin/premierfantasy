import Image from 'next/image'
import { useMemo, useState } from 'react'

import type { PoolPlayer, Position } from '@/entities/squad'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

import { POSITION_NAMES, priceLabel } from './player-card'
import { PlayerPhoto } from './player-photo'

interface PlayerPickerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    players: PoolPlayer[]
    /** Positions that can still be added here; one for a pitch slot, several for the bench. */
    positions: Position[]
    /** Why a player cannot be added, or null when they can. */
    reason: (player: PoolPlayer) => string | null
    /** Budget left if the slot is empty (the replaced player's price already given back). */
    bankTenths: number
    showForecast: boolean
    /** Players the user keeps out of auto-build. */
    excludedIds: string[]
    onToggleExclude: (id: string) => void
    onPick: (player: PoolPlayer) => void
}

const ALL_CLUBS = 'all'
const SORTS = { forecast: 'Expected points', form: 'Form', price: 'Price' } as const

type Sort = keyof typeof SORTS

export function PlayerPicker(props: PlayerPickerProps) {
    const [position, setPosition] = useState<Position>(props.positions[0])
    const [club, setClub] = useState(ALL_CLUBS)
    const [q, setQ] = useState('')
    const [sort, setSort] = useState<Sort>(props.showForecast ? 'forecast' : 'form')
    const [affordable, setAffordable] = useState(false)

    const clubs = useMemo(
        () =>
            [...new Map(props.players.map((p) => [p.clubId, p.clubName])).entries()].sort((a, b) =>
                a[1].localeCompare(b[1]),
            ),
        [props.players],
    )
    const clubItems = [
        { value: ALL_CLUBS, label: 'All clubs' },
        ...clubs.map(([value, label]) => ({ value, label })),
    ]
    const sortItems = Object.entries(SORTS)
        .filter(([k]) => k !== 'forecast' || props.showForecast)
        .map(([value, label]) => ({ value, label }))
    const key = sort === 'price' ? 'priceTenths' : sort
    const list = props.players
        .filter((p) => p.position === position)
        .filter((p) => club === ALL_CLUBS || p.clubId === club)
        .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
        .filter((p) => !affordable || (p.priceTenths ?? 0) <= props.bankTenths)
        .sort((a, b) => (b[key] ?? -1) - (a[key] ?? -1) || a.name.localeCompare(b.name))
        .slice(0, 80)

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-base">{props.title}</DialogTitle>
                    <DialogDescription>
                        You have {priceLabel(props.bankTenths)} to spend on this player.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-wrap gap-2 text-sm">
                    {props.positions.length > 1 && (
                        <div className="flex gap-1" role="group" aria-label="Position">
                            {props.positions.map((p) => (
                                <Button
                                    key={p}
                                    size="sm"
                                    variant={p === position ? 'default' : 'outline'}
                                    onClick={() => setPosition(p)}
                                >
                                    {p}
                                </Button>
                            ))}
                        </div>
                    )}
                    <Input
                        className="h-8 w-40"
                        placeholder="Search by name"
                        aria-label="Search by name"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <Select items={clubItems} value={club} onValueChange={(value) => value && setClub(value)}>
                        <SelectTrigger aria-label="Club" className="w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {clubItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        items={sortItems}
                        value={sort}
                        onValueChange={(value) => value && setSort(value as Sort)}
                    >
                        <SelectTrigger aria-label="Sort by" className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {sortItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <label className="flex items-center gap-1.5 text-xs">
                        <input
                            type="checkbox"
                            checked={affordable}
                            onChange={(e) => setAffordable(e.target.checked)}
                        />
                        Only players I can afford
                    </label>
                </div>
                <ul
                    className="-mx-1 min-h-0 flex-1 overflow-auto px-1"
                    aria-label={`Available ${POSITION_NAMES[position]}s`}
                >
                    {list.length === 0 && (
                        <li className="py-6 text-center text-muted-foreground">No players match.</li>
                    )}
                    {list.map((p) => {
                        const blocked = props.reason(p)
                        const tooExpensive = (p.priceTenths ?? 0) > props.bankTenths

                        return (
                            <li
                                key={p.id}
                                className="flex items-center gap-3 border-b py-2"
                                data-player={p.name}
                            >
                                <PlayerPhoto src={p.photoUrl} name={p.name} className="size-9" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {p.name}
                                        {p.availability && p.availability.status !== 'a' && (
                                            <Badge variant="outline" className="ml-2">
                                                {p.availability.status === 'd' ? 'Doubt' : 'Out'}
                                            </Badge>
                                        )}
                                    </p>
                                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                        {p.clubLogo && (
                                            <Image
                                                src={p.clubLogo}
                                                alt=""
                                                width={14}
                                                height={14}
                                                className="size-3.5 object-contain"
                                            />
                                        )}
                                        {p.clubName}
                                        {p.availability &&
                                        p.availability.status !== 'a' &&
                                        p.availability.news
                                            ? `, ${p.availability.news}`
                                            : ''}
                                    </p>
                                </div>
                                <div className="text-right text-xs">
                                    <p
                                        className={
                                            tooExpensive ? 'font-semibold text-destructive' : 'font-semibold'
                                        }
                                    >
                                        {priceLabel(p.priceTenths)}
                                    </p>
                                    <p className="text-muted-foreground">form {p.form?.toFixed(1) ?? '—'}</p>
                                </div>
                                {props.showForecast && (
                                    <div className="w-12 text-right font-audiowide text-base">
                                        {p.forecast?.toFixed(1) ?? '—'}
                                    </div>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => props.onToggleExclude(p.id)}
                                    title="Auto-build will never pick an excluded player"
                                >
                                    {props.excludedIds.includes(p.id) ? 'Excluded' : 'Exclude'}
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={blocked !== null}
                                    onClick={() => props.onPick(p)}
                                    title={blocked ?? undefined}
                                >
                                    {blocked ?? 'Add'}
                                </Button>
                            </li>
                        )
                    })}
                </ul>
            </DialogContent>
        </Dialog>
    )
}

import { Add01Icon, LockIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'

import type { PoolPlayer, Position } from '@/entities/squad'

import { cn } from '@/shared/lib/utils'

export const priceLabel = (tenths: number | null) => (tenths === null ? '—' : `£${(tenths / 10).toFixed(1)}m`)

/** "J. van Hecke" → "van Hecke": the card has room for a surname, not for initials. */
export const surname = (name: string) => name.replace(/^(\p{Lu}\.\s?)+/u, '')

export const POSITION_NAMES: Record<Position, string> = {
    GK: 'goalkeeper',
    DEF: 'defender',
    MID: 'midfielder',
    FWD: 'forward',
}

const SIZE = 'h-[6.75rem] w-[4.9rem] sm:h-[7.5rem] sm:w-[5.5rem]'

interface PlayerCardProps {
    player: PoolPlayer
    role?: 'captain' | 'vice' | null
    locked?: boolean
    /** Shows the forecast when it is on, form otherwise. */
    showForecast: boolean
}

/** A gold collector-style card: the number on top is what the player is expected to score (or recent form). */
export function PlayerCard({ player, role = null, locked = false, showForecast }: PlayerCardProps) {
    const value = showForecast ? player.forecast : player.form
    const availability = player.availability?.status
    const out = availability !== undefined && availability !== 'a' && availability !== 'd'
    const doubt = availability === 'd'

    return (
        <div className={cn('relative', SIZE)}>
            <div
                className={cn(
                    'relative flex size-full flex-col overflow-hidden rounded-t-xl rounded-b-[1.6rem] border border-amber-700/40 bg-gradient-to-b from-amber-50 via-amber-200 to-amber-400 text-amber-950 shadow-[0_6px_14px_-4px_rgba(0,0,0,0.5)] transition-transform group-hover:-translate-y-0.5',
                    out && 'saturate-50 ring-2 ring-red-500',
                    doubt && 'ring-2 ring-orange-400',
                )}
            >
                <div className="flex items-start justify-between px-2 pt-1.5">
                    <div className="leading-none">
                        <div className="font-audiowide text-xl sm:text-2xl">
                            {value === null ? '—' : value.toFixed(1)}
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold text-amber-900/70">
                            {showForecast ? 'pts' : 'form'}
                        </div>
                    </div>
                    {player.clubLogo ? (
                        <Image
                            src={player.clubLogo}
                            alt={player.clubName}
                            width={22}
                            height={22}
                            className="size-[22px] object-contain"
                        />
                    ) : (
                        <span className="text-[10px] font-bold">{player.clubName.slice(0, 3)}</span>
                    )}
                </div>
                <div className="mt-auto space-y-0.5 pb-1.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-900/80">
                        {player.position}
                        {locked && (
                            <HugeiconsIcon icon={LockIcon} size={10} aria-label="Locked for auto-build" />
                        )}
                    </div>
                    <div className="bg-amber-950 px-1 py-0.5 text-amber-50">
                        <div className="truncate text-[11px] font-semibold leading-tight">
                            {surname(player.name)}
                        </div>
                        <div className="text-[10px] leading-tight text-amber-300">
                            {priceLabel(player.priceTenths)}
                        </div>
                    </div>
                </div>
                {(out || doubt) && (
                    <span
                        className={cn(
                            'absolute bottom-[3.1rem] left-1.5 rounded px-1 text-[9px] font-bold text-white',
                            out ? 'bg-red-600' : 'bg-orange-500',
                        )}
                    >
                        {out ? 'Out' : 'Doubt'}
                    </span>
                )}
            </div>
            {role && (
                <span
                    className={cn(
                        'absolute -top-1.5 -right-1.5 z-10 grid size-5 place-items-center ring-2 ring-white/80 rounded-full text-[10px] font-bold',
                        role === 'captain' ? 'bg-black text-amber-300' : 'bg-zinc-700 text-white',
                    )}
                >
                    {role === 'captain' ? 'C' : 'V'}
                </span>
            )}
        </div>
    )
}

export function EmptySlot({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`Add ${label}`}
            className={cn(
                'group flex flex-col items-center justify-center gap-1 rounded-t-xl rounded-b-[1.6rem] border-2 border-dashed border-white/60 bg-white/5 text-white/90 transition hover:border-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                SIZE,
            )}
        >
            <HugeiconsIcon icon={Add01Icon} size={20} />
            <span className="text-xs font-semibold">{label}</span>
        </button>
    )
}

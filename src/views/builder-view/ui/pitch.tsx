import type { PoolPlayer, Position } from '@/entities/squad'

import { EmptySlot, PlayerCard } from './player-card'

import type { ReactNode } from 'react'

export type Zone = { zone: 'xi'; position: Position } | { zone: 'bench' }

interface PitchProps {
    /** Rows from the attack down to the goalkeeper. */
    rows: { position: Position; slots: number; ids: string[] }[]
    bench: string[]
    benchSlots: number
    players: Map<string, PoolPlayer>
    captainId: string
    viceCaptainId: string
    lockedIds: string[]
    showForecast: boolean
    onEmpty: (zone: Zone) => void
    /** Wraps a card in its action menu. */
    cardMenu: (id: string, zone: 'xi' | 'bench', card: ReactNode) => ReactNode
}

const LINES = 'stroke-white/45 fill-none'

export function Pitch(props: PitchProps) {
    const { players, captainId, viceCaptainId, lockedIds, showForecast } = props

    const card = (id: string, zone: 'xi' | 'bench') => {
        const player = players.get(id)

        if (!player) return null

        const role = id === captainId ? 'captain' : id === viceCaptainId ? 'vice' : null

        return props.cardMenu(
            id,
            zone,
            <PlayerCard
                player={player}
                role={role}
                locked={lockedIds.includes(id)}
                showForecast={showForecast}
            />,
        )
    }

    return (
        <div className="overflow-hidden rounded-lg bg-green-800 shadow-inner ring-1 ring-black/20">
            <div className="relative bg-[repeating-linear-gradient(180deg,#15803d_0,#15803d_56px,#16a34a_56px,#16a34a_112px)] px-2 py-5 sm:px-6">
                <svg
                    aria-hidden
                    viewBox="0 0 400 520"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-3 size-[calc(100%-1.5rem)]"
                >
                    <rect x="2" y="2" width="396" height="516" rx="6" className={LINES} strokeWidth="2" />
                    <line x1="2" y1="260" x2="398" y2="260" className={LINES} strokeWidth="2" />
                    <circle cx="200" cy="260" r="46" className={LINES} strokeWidth="2" />
                    <rect x="110" y="2" width="180" height="80" className={LINES} strokeWidth="2" />
                    <rect x="150" y="2" width="100" height="32" className={LINES} strokeWidth="2" />
                    <rect x="110" y="438" width="180" height="80" className={LINES} strokeWidth="2" />
                    <rect x="150" y="486" width="100" height="32" className={LINES} strokeWidth="2" />
                </svg>
                <div className="relative flex min-h-[34rem] flex-col justify-around gap-3 sm:min-h-[40rem]">
                    {props.rows.map((row) => (
                        <div
                            key={row.position}
                            className="flex justify-center gap-2 sm:gap-5"
                            data-row={row.position}
                        >
                            {Array.from({ length: row.slots }, (_, i) => {
                                const id = row.ids[i]

                                return (
                                    <div key={id ?? `empty-${i}`} className="group">
                                        {id ? (
                                            card(id, 'xi')
                                        ) : (
                                            <EmptySlot
                                                label={row.position}
                                                onClick={() =>
                                                    props.onEmpty({ zone: 'xi', position: row.position })
                                                }
                                            />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-green-950/90 px-2 py-3 sm:px-6">
                <p className="mb-2 text-center text-xs font-semibold text-green-100/80">
                    Bench, in substitution order
                </p>
                <div className="flex justify-center gap-2 sm:gap-5" data-row="bench">
                    {Array.from({ length: props.benchSlots }, (_, i) => {
                        const id = props.bench[i]

                        return (
                            <div key={id ?? `bench-empty-${i}`} className="group">
                                {id ? (
                                    card(id, 'bench')
                                ) : (
                                    <EmptySlot label="Sub" onClick={() => props.onEmpty({ zone: 'bench' })} />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

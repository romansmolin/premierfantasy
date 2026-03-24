'use client'

import Image from 'next/image'

import type { PlayerPosition, SelectedPlayer } from '@/entities/players'

import { FantasyTeamFormationSelect, useFormation } from '../../fantasy-team-formation-select'
import { useFantasyTeamField } from '../model/use-fantasy-team-field'

function PlayerSlot({ player, position }: { player?: SelectedPlayer; position: PlayerPosition }) {
    if (player) {
        return (
            <div className="flex flex-col items-center gap-0.5 w-12">
                <div className="relative size-9 rounded-full overflow-hidden border-2 border-white/30 bg-emerald-700">
                    <Image src={player.photo} alt={player.name} fill className="object-cover" sizes="36px" />
                </div>

                <span className="text-[9px] text-white font-medium text-center leading-tight truncate w-full">
                    {player.name}
                </span>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center gap-0.5 w-12">
            <div className="size-9 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
                <span className="text-[9px] text-white/40 font-medium">{position}</span>
            </div>

            <span className="text-[9px] text-white/30 font-medium">&nbsp;</span>
        </div>
    )
}

export function FantasyTeamField() {
    const { formation, setFormation, slots } = useFormation()
    const { playersByPosition, getSlotCount, positionOrder } = useFantasyTeamField(slots)

    return (
        <div className="flex flex-col gap-3">
            <FantasyTeamFormationSelect selectedFormation={formation} onSelectFormation={setFormation} />

            <div className="relative w-full max-w-sm mx-auto aspect-4/5 rounded-lg bg-linear-to-b from-emerald-800 to-emerald-900 overflow-hidden">
                {/* Field markings */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {/* Halfway line */}
                    <div className="absolute top-1/2 left-4 right-4 h-px bg-white/10" />

                    {/* Center circle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-16 rounded-full border border-white/10" />

                    {/* Center dot */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-white/10" />

                    {/* Top penalty area */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/5 h-[15%] border-b border-x border-white/10 rounded-b-sm" />

                    {/* Bottom penalty area */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/5 h-[15%] border-t border-x border-white/10 rounded-t-sm" />
                </div>

                {/* Formation rows */}
                <div className="relative z-10 flex flex-col justify-around h-full py-4">
                    {positionOrder.map((position) => {
                        const slotCount = getSlotCount(position)
                        const players = playersByPosition[position]

                        return (
                            <div key={position} className="flex justify-center gap-3">
                                {Array.from({ length: slotCount }, (_, i) => (
                                    <PlayerSlot
                                        key={`${position}-${i}`}
                                        player={players[i]}
                                        position={position}
                                    />
                                ))}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

'use client'

import Image from 'next/image'
import { useState } from 'react'

import { usePlayerAnalytics, PlayerAnalyticsModal } from '@/features/ai'
import { usePlayerDetails } from '@/features/player/explore-players/model/use-player-details'
import { useOptionalTransferMode } from '@/features/player/transfer'

import { PlayerDetailsModal } from '@/entities/players/ui/player-details-modal'

import type { PlayerPosition, SelectedPlayer } from '@/entities/players'

import { FantasyTeamFormationSelect, useFormation } from '../../fantasy-team-formation-select'
import { useFantasyTeamField } from '../model/use-fantasy-team-field'

function PlayerSlot({
    player,
    position,
    isSelected,
    onSelect,
}: {
    player?: SelectedPlayer
    position: PlayerPosition
    isSelected?: boolean
    onSelect?: () => void
}) {
    if (player) {
        return (
            <button
                type="button"
                className={`flex flex-col items-center gap-0.5 w-12 ${onSelect ? 'cursor-pointer' : ''}`}
                onClick={onSelect}
            >
                <div
                    className={`relative size-9 rounded-full overflow-hidden border-2 bg-emerald-700 transition-colors ${
                        isSelected ? 'border-orange-400 ring-2 ring-orange-400/50' : 'border-white/30'
                    }`}
                >
                    <Image src={player.photo} alt={player.name} fill className="object-cover" sizes="36px" />
                </div>

                <span className="text-[9px] text-white font-medium text-center leading-tight truncate w-full">
                    {player.name}
                </span>
            </button>
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
    const transferCtx = useOptionalTransferMode()

    const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
    const {
        player: playerDetails,
        isLoading: isPlayerLoading,
        error: playerError,
    } = usePlayerDetails(selectedPlayerId)
    const analytics = usePlayerAnalytics(selectedPlayerId)

    const handlePlayerClick = (player: SelectedPlayer) => {
        if (transferCtx?.isTransferMode) {
            transferCtx.selectPlayerOut(player)
        } else {
            setSelectedPlayerId(player.id)
        }
    }

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
                                        isSelected={
                                            !!transferCtx?.isTransferMode &&
                                            !!players[i] &&
                                            transferCtx.selectedOutPlayer?.id === players[i].id
                                        }
                                        onSelect={
                                            players[i] ? () => handlePlayerClick(players[i]) : undefined
                                        }
                                    />
                                ))}
                            </div>
                        )
                    })}
                </div>
            </div>

            <PlayerDetailsModal
                open={selectedPlayerId !== null}
                onClose={() => setSelectedPlayerId(null)}
                player={playerDetails}
                isLoading={isPlayerLoading}
                error={playerError}
                onRequestAnalysis={analytics.requestAnalysis}
                isAnalysisLoading={analytics.isLoading}
                canAffordAnalysis={analytics.canAfford}
                analysisCost={analytics.cost}
            />

            <PlayerAnalyticsModal
                open={analytics.isOpen}
                onClose={analytics.closeModal}
                analysis={analytics.analysis}
                isLoading={analytics.isLoading}
            />
        </div>
    )
}

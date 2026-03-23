'use client'

import Image from 'next/image'

import { BUDGET_TOTAL, MAX_SQUAD_SIZE, POSITION_LIMITS } from '@/entities/players'
import type { PlayerPosition } from '@/entities/players'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

import { useSelectionSummary } from '../model/use-selection-summary'

export const SelectionSummary = () => {
    const {
        selectedPlayers,
        removePlayer,
        budgetLeft,
        positionCounts,
        budgetUsedPercent,
        squadComplete,
        handleSave,
    } = useSelectionSummary()

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                    <span className="font-medium">Budget</span>
                    <span>
                        {budgetLeft.toFixed(1)}m / {BUDGET_TOTAL}m remaining
                    </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                    <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
                    />
                </div>
            </div>

            <div className="flex justify-between text-sm">
                <span className="font-medium">Squad</span>
                <span>
                    {selectedPlayers.length} / {MAX_SQUAD_SIZE} players
                </span>
            </div>

            <div className="flex flex-wrap gap-2">
                {(Object.entries(POSITION_LIMITS) as [PlayerPosition, { min: number; max: number }][]).map(
                    ([position, { min, max }]) => (
                        <Badge key={position} variant="outline">
                            {position}: {positionCounts[position] || 0}/{min}-{max}
                        </Badge>
                    ),
                )}
            </div>

            {selectedPlayers.length > 0 && (
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Selected Players</span>
                    <div className="flex flex-col gap-1">
                        {selectedPlayers.map((player) => (
                            <div
                                key={player.id}
                                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <Image
                                        src={player.photo}
                                        alt={player.name}
                                        width={24}
                                        height={24}
                                        className="rounded-full"
                                    />
                                    <span>{player.name}</span>
                                    <Badge variant="secondary">{player.position}</Badge>
                                    <span className="text-muted-foreground">{player.price}m</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removePlayer(player.id)}>
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Button className="w-full" disabled={!squadComplete.valid} onClick={handleSave}>
                Save Team
            </Button>
        </div>
    )
}

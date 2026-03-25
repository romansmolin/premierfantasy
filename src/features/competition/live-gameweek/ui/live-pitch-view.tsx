'use client'

import type { LivePlayerPoints } from '@/entities/gameweek/model/gameweek-live.types'

import { Badge } from '@/shared/ui/badge'

interface LivePitchViewProps {
    players: LivePlayerPoints[]
}

const positionOrder = ['GK', 'DEF', 'MID', 'FWD'] as const

export const LivePitchView = ({ players }: LivePitchViewProps) => {
    const grouped = positionOrder.map((pos) => ({
        position: pos,
        players: players.filter((p) => p.position === pos),
    }))

    return (
        <div className="bg-green-900/20 rounded-xl p-6 space-y-6">
            {grouped.map((group) => (
                <div key={group.position} className="flex justify-center gap-4">
                    {group.players.map((player) => (
                        <div
                            key={player.playerExternalId}
                            className="flex flex-col items-center gap-1 min-w-20"
                        >
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-medium border ${
                                    player.isPlaying ? 'bg-green-500/20 border-green-500' : 'bg-background'
                                }`}
                            >
                                {player.position}
                            </div>
                            <p className="text-xs text-center font-medium truncate max-w-20">
                                {player.name.split(' ').pop()}
                            </p>
                            <Badge variant="default" className="text-xs">
                                {player.currentPoints}
                            </Badge>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}

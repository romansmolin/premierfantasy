'use client'

import type { ISquadPlayerWithStats } from '@/entities/fantasy-team'

import { Badge } from '@/shared/ui/badge'

interface GameweekDetailPitchProps {
    players: ISquadPlayerWithStats[]
}

const positionOrder = ['GK', 'DEF', 'MID', 'FWD'] as const

export const GameweekDetailPitch = ({ players }: GameweekDetailPitchProps) => {
    const grouped = positionOrder.map((pos) => ({
        position: pos,
        players: players.filter((p) => p.position === pos),
    }))

    return (
        <div className="bg-green-900/20 rounded-xl p-6 space-y-6">
            {grouped.map((group) => (
                <div key={group.position} className="flex justify-center gap-4">
                    {group.players.map((player) => (
                        <div key={player.externalId} className="flex flex-col items-center gap-1 min-w-20">
                            <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center text-xs font-medium border">
                                {player.position}
                            </div>
                            <p className="text-xs text-center font-medium truncate max-w-20">
                                {player.name.split(' ').pop()}
                            </p>
                            <Badge variant={player.stats ? 'default' : 'secondary'} className="text-xs">
                                {player.stats?.totalPoints ?? '-'}
                            </Badge>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}

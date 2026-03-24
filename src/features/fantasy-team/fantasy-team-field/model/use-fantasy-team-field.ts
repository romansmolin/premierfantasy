import { useMemo } from 'react'

import { usePlayersStorage } from '@/entities/players'
import type { PlayerPosition, SelectedPlayer } from '@/entities/players'

const POSITION_ORDER: PlayerPosition[] = ['FWD', 'MID', 'DEF', 'GK']

export function useFantasyTeamField(slots: Record<PlayerPosition, number>) {
    const selectedPlayers = usePlayersStorage((s) => s.selectedPlayers)

    const playersByPosition = useMemo(() => {
        const grouped: Record<PlayerPosition, SelectedPlayer[]> = {
            GK: [],
            DEF: [],
            MID: [],
            FWD: [],
        }

        for (const player of selectedPlayers) {
            grouped[player.position].push(player)
        }

        return grouped
    }, [selectedPlayers])

    const getSlotCount = (position: PlayerPosition) =>
        Math.max(playersByPosition[position].length, slots[position])

    return { playersByPosition, getSlotCount, positionOrder: POSITION_ORDER }
}

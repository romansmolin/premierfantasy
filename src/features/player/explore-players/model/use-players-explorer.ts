import { useMemo, useState } from 'react'

import type { ISquadPlayer } from '@/entities/team'

type PlayersByTeam = Record<string, ISquadPlayer[]>

const initialFilter = {
    playerName: '',
    playerPosition: '',
    playerClub: '',
}

export const usePlayersExplorer = (playersByTeam: PlayersByTeam) => {
    const [playersFilter, setPlayersFilter] = useState(initialFilter)

    const filteredPlayers = useMemo(() => {
        const nameQuery = playersFilter.playerName.trim().toLowerCase()

        if (!nameQuery) return playersByTeam

        const result: PlayersByTeam = {}

        for (const [teamId, players] of Object.entries(playersByTeam)) {
            const matched = players.filter((p) => p.name.toLowerCase().includes(nameQuery))

            if (matched.length > 0) {
                result[teamId] = matched
            }
        }

        return result
    }, [playersByTeam, playersFilter])

    const filteredCount = useMemo(
        () => Object.values(filteredPlayers).reduce((sum, p) => sum + p.length, 0),
        [filteredPlayers],
    )

    const setFilterPlayerName = (playerName: string) => {
        setPlayersFilter((prev) => ({ ...prev, playerName }))
    }

    const setFilterPlayerPosition = (playerPosition: string) => {
        setPlayersFilter((prev) => ({ ...prev, playerPosition }))
    }

    const setFilterPlayerClub = (playerClub: string) => {
        setPlayersFilter((prev) => ({ ...prev, playerClub }))
    }

    return {
        playersFilter,
        setFilterPlayerName,
        setFilterPlayerPosition,
        setFilterPlayerClub,
        filteredPlayers,
        filteredCount,
    }
}

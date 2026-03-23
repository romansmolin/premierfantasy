import { useMemo, useState } from 'react'

import { useAllTeams, useTeamsStore, type ISquadPlayer } from '@/entities/team'

type PlayersByTeam = Record<string, ISquadPlayer[]>

const initialFilter = {
    playerName: '',
    playerPosition: '',
    playerClub: '',
}

export const usePlayersExplorer = (playersByTeam: PlayersByTeam) => {
    const [playersFilter, setPlayersFilter] = useState(initialFilter)
    const { teams } = useAllTeams()
    const { selectedTeamsIds, selectTeam } = useTeamsStore()

    const teamLookup = useMemo(() => {
        const lookup: Record<string, { name: string; logo: string }> = {}

        for (const { team } of teams) {
            lookup[team.id.toString()] = { name: team.name, logo: team.logo }
        }

        return lookup
    }, [teams])

    const filteredPlayers = useMemo(() => {
        const nameQuery = playersFilter.playerName.trim().toLowerCase()
        const positionFilter = playersFilter.playerPosition
        const clubFilter = playersFilter.playerClub

        if (!nameQuery && !positionFilter && !clubFilter) return playersByTeam

        const result: PlayersByTeam = {}

        for (const [teamId, players] of Object.entries(playersByTeam)) {
            if (clubFilter && teamId !== clubFilter) continue

            const matched = players.filter((p) => {
                if (nameQuery && !p.name.toLowerCase().includes(nameQuery)) return false
                if (positionFilter && p.position !== positionFilter) return false

                return true
            })

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
        selectedTeamsIds,
        selectTeam,
        teams,
        teamLookup,
    }
}

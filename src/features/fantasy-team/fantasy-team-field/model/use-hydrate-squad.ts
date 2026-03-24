'use client'

import { useEffect, useRef } from 'react'
import useSWR from 'swr'

import { fantasyTeamService, useFantasyTeams } from '@/entities/fantasy-team'
import type { ISquadPlayer } from '@/entities/fantasy-team'
import { usePlayersStorage } from '@/entities/players'
import type { SelectedPlayer } from '@/entities/players'

function mapSquadPlayer(player: ISquadPlayer): SelectedPlayer {
    return {
        id: player.externalId,
        name: player.name,
        position: player.position,
        teamId: player.teamExternalId,
        price: player.purchasePrice,
        photo: `https://media.api-sports.io/football/players/${player.externalId}.png`,
    }
}

export const useHydrateSquad = () => {
    const { fantasyTeams } = useFantasyTeams()
    const initPlayers = usePlayersStorage((s) => s.initPlayers)
    const hydratedRef = useRef(false)

    const teamId = fantasyTeams?.[0]?.id

    const { data: squadPlayers } = useSWR(
        teamId ? `/api/fantasy-teams/${teamId}/squad` : null,
        () => fantasyTeamService.getSquad(teamId!),
        { revalidateOnFocus: false },
    )

    useEffect(() => {
        if (squadPlayers && squadPlayers.length > 0 && !hydratedRef.current) {
            hydratedRef.current = true
            initPlayers(squadPlayers.map(mapSquadPlayer))
        }
    }, [squadPlayers, initPlayers])
}

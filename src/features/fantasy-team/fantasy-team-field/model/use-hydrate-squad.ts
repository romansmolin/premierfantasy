'use client'

import { useSearchParams } from 'next/navigation'
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

/**
 * Loads the saved squad for the competition currently being built for.
 *
 * The selection store is global and in-memory, so switching competitions has to
 * reset it — otherwise players picked for one league leak into the next one,
 * where their clubs do not even exist. Hydration is keyed by competition *and*
 * team, and an empty or missing team clears the board rather than leaving it.
 */
export const useHydrateSquad = () => {
    const { fantasyTeams, isLoading: isLoadingTeams } = useFantasyTeams()
    const initPlayers = usePlayersStorage((s) => s.initPlayers)
    const hydratedRef = useRef<string | null>(null)

    const searchParams = useSearchParams()
    const competitionId = searchParams.get('competitionId')

    const team = fantasyTeams?.find((t) => t.competitionId === competitionId) ?? null
    const teamId = team?.id ?? null

    const { data: squadPlayers } = useSWR(
        teamId ? `/api/fantasy-teams/${teamId}/squad` : null,
        () => fantasyTeamService.getSquad(teamId!),
        { revalidateOnFocus: false },
    )

    useEffect(() => {
        if (!competitionId) return

        // Wait for the team list, or a competition the user has a team in would
        // briefly look empty and wipe the board.
        if (isLoadingTeams) return

        const key = `${competitionId}:${teamId ?? 'none'}`

        if (hydratedRef.current === key) return

        if (teamId) {
            if (!squadPlayers) return

            hydratedRef.current = key
            initPlayers(squadPlayers.map(mapSquadPlayer))

            return
        }

        hydratedRef.current = key
        initPlayers([])
    }, [competitionId, teamId, isLoadingTeams, squadPlayers, initPlayers])
}

'use client'

import { useEffect, useRef, useState } from 'react'
import useSWRMutation from 'swr/mutation'

import { getTeamsPlayersByTeamId } from '../api/team.service'

import { useTeamsStore } from './team.storage'

import type { ISquadPlayer } from './team.types'

export const useTeamPlayers = () => {
    const selectedTeamsIds = useTeamsStore((state) => state.selectedTeamsIds)
    const prevIdsRef = useRef<number[]>([])
    const [playersByTeam, setPlayersByTeam] = useState<Record<number, ISquadPlayer[]>>({})

    const { trigger } = useSWRMutation('teams-players', (_key: string, { arg }: { arg: number }) =>
        getTeamsPlayersByTeamId(arg),
    )

    useEffect(() => {
        const prevIds = prevIdsRef.current
        const addedIds = selectedTeamsIds.filter((id) => !prevIds.includes(id))
        const removedIds = prevIds.filter((id) => !selectedTeamsIds.includes(id))

        if (removedIds.length > 0) {
            setPlayersByTeam((prev) => {
                const next = { ...prev }

                removedIds.forEach((id) => delete next[id])

                return next
            })
        }

        addedIds.forEach(async (teamId) => {
            const players = await trigger(teamId)

            if (players) {
                setPlayersByTeam((prev) => ({ ...prev, [teamId]: players }))
            }
        })

        prevIdsRef.current = selectedTeamsIds
    }, [selectedTeamsIds, trigger])

    const allPlayers = Object.values(playersByTeam).flat()

    return { players: allPlayers, playersByTeam }
}

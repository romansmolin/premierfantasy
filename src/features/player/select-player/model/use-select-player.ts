import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'

import {
    mapApiPosition,
    selectBudgetLeft,
    selectSelectedPlayerIds,
    usePlayersStorage,
    validateAddPlayer,
} from '@/entities/players'
import { getFallbackPrice, usePrices } from '@/entities/players/model/use-prices'
import type { ISquadPlayer } from '@/entities/team/model/team.types'

export const useSelectPlayer = () => {
    const { addPlayer, removePlayer, selectedPlayers, formation } = usePlayersStorage(
        useShallow((state) => ({
            addPlayer: state.addPlayer,
            removePlayer: state.removePlayer,
            selectedPlayers: state.selectedPlayers,
            formation: state.formation,
        })),
    )
    const selectedPlayerIds = usePlayersStorage(useShallow(selectSelectedPlayerIds))
    const budgetLeft = usePlayersStorage(selectBudgetLeft)
    const { priceMap } = usePrices()

    const handleSelectPlayer = (squadPlayer: ISquadPlayer, teamId: number) => {
        if (selectedPlayerIds.includes(squadPlayer.id)) {
            removePlayer(squadPlayer.id)

            return
        }

        const position = mapApiPosition(squadPlayer.position)
        const price = priceMap.get(squadPlayer.id) ?? getFallbackPrice(position)

        const candidate = {
            id: squadPlayer.id,
            name: squadPlayer.name,
            position,
            teamId,
            price,
            photo: squadPlayer.photo,
        }

        const result = validateAddPlayer(selectedPlayers, candidate, budgetLeft, formation)

        if (!result.valid) {
            toast.error(result.reason)

            return
        }

        addPlayer(candidate)
    }

    return {
        handleSelectPlayer,
        selectedPlayerIds,
    }
}

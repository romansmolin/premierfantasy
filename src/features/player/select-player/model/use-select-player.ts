import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'

import {
    generatePlayerPrice,
    mapApiPosition,
    selectBudgetLeft,
    selectSelectedPlayerIds,
    usePlayersStorage,
    validateAddPlayer,
} from '@/entities/players'
import type { ISquadPlayer } from '@/entities/team/model/team.types'

export const useSelectPlayer = () => {
    const { addPlayer, removePlayer, selectedPlayers } = usePlayersStorage(
        useShallow((state) => ({
            addPlayer: state.addPlayer,
            removePlayer: state.removePlayer,
            selectedPlayers: state.selectedPlayers,
        })),
    )
    const selectedPlayerIds = usePlayersStorage(useShallow(selectSelectedPlayerIds))
    const budgetLeft = usePlayersStorage(selectBudgetLeft)

    const handleSelectPlayer = (squadPlayer: ISquadPlayer, teamId: number) => {
        if (selectedPlayerIds.includes(squadPlayer.id)) {
            removePlayer(squadPlayer.id)

            return
        }

        const position = mapApiPosition(squadPlayer.position)
        const price = generatePlayerPrice(squadPlayer.id, position)

        const candidate = {
            id: squadPlayer.id,
            name: squadPlayer.name,
            position,
            teamId,
            price,
            photo: squadPlayer.photo,
        }

        const result = validateAddPlayer(selectedPlayers, candidate, budgetLeft)

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

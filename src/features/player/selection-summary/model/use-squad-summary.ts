import { useShallow } from 'zustand/react/shallow'

import {
    BUDGET_TOTAL,
    selectBudgetLeft,
    selectPositionCounts,
    usePlayersStorage,
    validateSquadComplete,
} from '@/entities/players'

export const useSquadSummary = () => {
    const { selectedPlayers, removePlayer } = usePlayersStorage(
        useShallow((state) => ({ selectedPlayers: state.selectedPlayers, removePlayer: state.removePlayer })),
    )

    const budgetLeft = usePlayersStorage(selectBudgetLeft)
    const positionCounts = usePlayersStorage(useShallow(selectPositionCounts))
    const budgetUsedPercent = ((BUDGET_TOTAL - budgetLeft) / BUDGET_TOTAL) * 100
    const squadComplete = validateSquadComplete(selectedPlayers)

    return {
        selectedPlayers,
        removePlayer,
        budgetLeft,
        positionCounts,
        budgetUsedPercent,
        squadComplete,
    }
}

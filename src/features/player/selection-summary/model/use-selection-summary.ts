import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'

import {
    BUDGET_TOTAL,
    selectBudgetLeft,
    selectPositionCounts,
    usePlayersStorage,
    validateSquadComplete,
} from '@/entities/players'

export const useSelectionSummary = () => {
    const { selectedPlayers, removePlayer } = usePlayersStorage(
        useShallow((state) => ({ selectedPlayers: state.selectedPlayers, removePlayer: state.removePlayer })),
    )

    const budgetLeft = usePlayersStorage(selectBudgetLeft)
    const positionCounts = usePlayersStorage(useShallow(selectPositionCounts))
    const budgetUsedPercent = ((BUDGET_TOTAL - budgetLeft) / BUDGET_TOTAL) * 100
    const squadComplete = validateSquadComplete(selectedPlayers)

    const handleSave = () => {
        if (!squadComplete.valid) {
            toast.error(squadComplete.reason)

            return
        }

        toast.success('Squad is valid and ready to save!')
    }

    return {
        selectedPlayers,
        removePlayer,
        budgetLeft,
        positionCounts,
        budgetUsedPercent,
        squadComplete,
        handleSave,
    }
}

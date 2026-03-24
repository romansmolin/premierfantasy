import { toast } from 'sonner'

import { validateSquadComplete } from '@/entities/players'

import { useSaveSquad } from './use-save-squad'
import { useSquadSummary } from './use-squad-summary'

export const useSelectionSummary = () => {
    const squadSummary = useSquadSummary()
    const { handleSave: save, isSaving, isNewTeam } = useSaveSquad()

    const handleSave = async () => {
        const validation = validateSquadComplete(squadSummary.selectedPlayers)

        if (!validation.valid) {
            toast.error(validation.reason)

            return
        }

        await save()
    }

    return {
        ...squadSummary,
        handleSave,
        isSaving,
        isNewTeam,
    }
}

import { useState } from 'react'

import { usePlayersStorage } from '@/entities/players'

import { FORMATIONS } from '../ui/fantasy-team-formation-select'

import type { FormationKey } from '../ui/fantasy-team-formation-select'

export function useFormation() {
    const [formation, setFormationState] = useState<FormationKey>('4-3-3')
    const setStoreFormation = usePlayersStorage((s) => s.setFormation)

    const setFormation = (key: FormationKey) => {
        setFormationState(key)
        setStoreFormation(FORMATIONS[key])
    }

    const slots = FORMATIONS[formation]

    return { formation, setFormation, slots }
}

import { useState } from 'react'

import { FORMATIONS } from '../ui/fantasy-team-formation-select'

import type { FormationKey } from '../ui/fantasy-team-formation-select'

export function useFormation() {
    const [formation, setFormation] = useState<FormationKey>('4-3-3')

    const slots = FORMATIONS[formation]

    return { formation, setFormation, slots }
}

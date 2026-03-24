import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

export const FORMATIONS = {
    '4-3-3': { GK: 1, DEF: 4, MID: 3, FWD: 3 },
    '4-4-2': { GK: 1, DEF: 4, MID: 4, FWD: 2 },
    '3-5-2': { GK: 1, DEF: 3, MID: 5, FWD: 2 },
    '3-4-3': { GK: 1, DEF: 3, MID: 4, FWD: 3 },
    '5-3-2': { GK: 1, DEF: 5, MID: 3, FWD: 2 },
    '5-4-1': { GK: 1, DEF: 5, MID: 4, FWD: 1 },
    '4-5-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
} as const

export type FormationKey = keyof typeof FORMATIONS

interface FantasyTeamFormationSelect {
    onSelectFormation: (formations: FormationKey) => void
    selectedFormation: FormationKey
}

export const FantasyTeamFormationSelect = ({
    onSelectFormation,
    selectedFormation,
}: FantasyTeamFormationSelect) => {
    return (
        <Select value={selectedFormation} onValueChange={(v) => onSelectFormation(v as FormationKey)}>
            <SelectTrigger className="w-full h-8!">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {Object.keys(FORMATIONS).map((key) => (
                    <SelectItem key={key} value={key}>
                        {key}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

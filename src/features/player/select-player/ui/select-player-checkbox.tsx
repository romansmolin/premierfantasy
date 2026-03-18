'use client'

import type { ISquadPlayer } from '@/entities/team/model/team.types'

import { Checkbox } from '@/shared/ui/checkbox'

import { useSelectPlayer } from '../model/use-select-player'

interface SelectPlayerCheckboxProps {
    player: ISquadPlayer
    teamId: number
}

export const SelectPlayerCheckbox = ({ player, teamId }: SelectPlayerCheckboxProps) => {
    const { handleSelectPlayer, selectedPlayerIds } = useSelectPlayer()

    return (
        <Checkbox
            onCheckedChange={() => handleSelectPlayer(player, teamId)}
            checked={selectedPlayerIds.includes(player.id)}
        />
    )
}

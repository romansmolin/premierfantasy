'use client'

import { Add01Icon, NoteEditIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'

import { useCreateFantasyTeam } from '../model/use-create-fantasy-team'

interface CreateFantasyTeamButtonProps {
    competitionId: string
    disabled?: boolean
    className?: string
}

export const CreateFantasyTeamButton = ({
    competitionId,
    disabled,
    className,
}: CreateFantasyTeamButtonProps) => {
    const { createTeam, isCreating, existingTeam } = useCreateFantasyTeam(competitionId)

    return (
        <Button className={className} disabled={disabled || isCreating} onClick={createTeam}>
            <HugeiconsIcon icon={existingTeam ? NoteEditIcon : Add01Icon} size={16} />
            {isCreating ? 'Creating…' : existingTeam ? 'View / Edit Team' : 'Create Fantasy Team'}
        </Button>
    )
}

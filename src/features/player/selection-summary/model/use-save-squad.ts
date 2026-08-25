import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import useSWRMutation from 'swr/mutation'

import { fantasyTeamService, useFantasyTeams } from '@/entities/fantasy-team'
import { MY_LEAGUES_KEY } from '@/entities/league'
import { usePlayersStorage } from '@/entities/players'
import type { SelectedPlayer } from '@/entities/players'

import { ApiError } from '@/shared/api/api-error'
import { useSession } from '@/shared/lib/auth-client'

const mapPlayersToSquad = (players: SelectedPlayer[]) =>
    players.map((p) => ({ id: p.id, name: p.name, position: p.position, price: p.price, teamId: p.teamId }))

export const useSaveSquad = () => {
    const { data: session } = useSession()
    const userId = session?.user?.id
    const userName = session?.user?.name

    const searchParams = useSearchParams()
    const competitionId = searchParams.get('competitionId')

    const { mutate: mutateGlobal } = useSWRConfig()
    const { fantasyTeams, mutate } = useFantasyTeams()
    const fantasyTeamId = fantasyTeams?.find((t) => t.competitionId === competitionId)?.id
    const selectedPlayers = usePlayersStorage((s) => s.selectedPlayers)

    const { trigger: createTeamAndSaveSquad, isMutating: isCreating } = useSWRMutation(
        userId && competitionId ? '/api/fantasy-teams' : null,
        async (_url: string, { arg }: { arg: SelectedPlayer[] }) => {
            const team = await fantasyTeamService.create({
                userId: userId!,
                competitionId: competitionId!,
                name: `${userName}'s Team`,
                budgetLeft: 100,
            })

            await fantasyTeamService.saveSquad(team.id, mapPlayersToSquad(arg))
            await Promise.all([mutate(), mutateGlobal(MY_LEAGUES_KEY)])
        },
    )

    const { trigger: updateSquad, isMutating: isUpdating } = useSWRMutation(
        fantasyTeamId ? `/api/fantasy-teams/${fantasyTeamId}/squad` : null,
        async (_url: string, { arg }: { arg: SelectedPlayer[] }) => {
            await fantasyTeamService.saveSquad(fantasyTeamId!, mapPlayersToSquad(arg))
            await mutateGlobal(MY_LEAGUES_KEY)
        },
    )

    const handleSave = async () => {
        if (!userId) {
            toast.error('Please sign in to save your squad.')

            return
        }

        if (!competitionId) {
            toast.error('No competition selected.')

            return
        }

        try {
            if (fantasyTeamId) {
                await updateSquad(selectedPlayers)
            } else {
                await createTeamAndSaveSquad(selectedPlayers)
            }

            toast.success('Squad saved successfully!')
        } catch (error) {
            // Surface what the API actually said — budget busts and closed join
            // windows come back as 422s with a usable message.
            toast.error(
                ApiError.isApiError(error) ? error.message : 'Failed to save squad. Please try again.',
            )
        }
    }

    return {
        handleSave,
        isSaving: isCreating || isUpdating,
        isNewTeam: !fantasyTeamId,
    }
}

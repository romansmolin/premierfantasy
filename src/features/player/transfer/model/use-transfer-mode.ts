'use client'

import { useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import useSWR from 'swr'

import type { ICreateTransfer, IStagedTransfer } from '@/entities/fantasy-team'
import { fantasyTeamService, useFantasyTeams } from '@/entities/fantasy-team'
import type { SelectedPlayer } from '@/entities/players'
import { usePlayersStorage } from '@/entities/players'

export const useTransferMode = () => {
    const { fantasyTeams, mutate: mutateTeams } = useFantasyTeams()
    const searchParams = useSearchParams()
    const competitionId = searchParams.get('competitionId')
    const fantasyTeamId = fantasyTeams?.find((t) => t.competitionId === competitionId)?.id
    const addPlayer = usePlayersStorage((s) => s.addPlayer)
    const removePlayer = usePlayersStorage((s) => s.removePlayer)

    const [selectedOutPlayer, setSelectedOutPlayer] = useState<SelectedPlayer | null>(null)
    const [stagedTransfers, setStagedTransfers] = useState<IStagedTransfer[]>([])
    const [isConfirming, setIsConfirming] = useState(false)

    const { data: transferInfo, mutate: mutateTransferInfo } = useSWR(
        fantasyTeamId ? `/api/fantasy-teams/${fantasyTeamId}/transfers` : null,
        () => fantasyTeamService.getTransferInfo(fantasyTeamId!),
    )

    const isTransferMode = !!fantasyTeamId

    const serverTransfersMade = transferInfo?.transfersMade ?? 0
    const serverFreeTransfers = transferInfo?.freeTransfers ?? 1
    const totalTransfers = serverTransfersMade + stagedTransfers.length
    const freeRemaining = Math.max(0, serverFreeTransfers - totalTransfers)
    const pointsCost = Math.max(0, totalTransfers - serverFreeTransfers) * 4

    const selectPlayerOut = useCallback((player: SelectedPlayer) => {
        setSelectedOutPlayer((prev) => (prev?.id === player.id ? null : player))
    }, [])

    const selectPlayerIn = useCallback(
        (player: SelectedPlayer) => {
            if (!selectedOutPlayer) return

            setStagedTransfers((prev) => [
                ...prev,
                {
                    playerOut: {
                        id: selectedOutPlayer.id,
                        name: selectedOutPlayer.name,
                        position: selectedOutPlayer.position,
                        price: selectedOutPlayer.price,
                    },
                    playerIn: {
                        id: player.id,
                        name: player.name,
                        position: player.position,
                        price: player.price,
                        teamId: player.teamId,
                    },
                },
            ])

            removePlayer(selectedOutPlayer.id)
            addPlayer(player)
            setSelectedOutPlayer(null)
        },
        [selectedOutPlayer, removePlayer, addPlayer],
    )

    const undoTransfer = useCallback(
        (index: number) => {
            const transfer = stagedTransfers[index]

            if (!transfer) return

            removePlayer(transfer.playerIn.id)

            addPlayer({
                id: transfer.playerOut.id,
                name: transfer.playerOut.name,
                position: transfer.playerOut.position as SelectedPlayer['position'],
                price: transfer.playerOut.price,
                teamId: 0,
                photo: '',
            })

            setStagedTransfers((prev) => prev.filter((_, i) => i !== index))
        },
        [stagedTransfers, removePlayer, addPlayer],
    )

    const confirmTransfers = useCallback(async () => {
        if (!fantasyTeamId || stagedTransfers.length === 0) return

        setIsConfirming(true)

        try {
            const transfers: ICreateTransfer[] = stagedTransfers.map((t) => ({
                playerOutId: t.playerOut.id,
                playerInId: t.playerIn.id,
                playerInName: t.playerIn.name,
                playerInPosition: t.playerIn.position as ICreateTransfer['playerInPosition'],
                playerInPrice: t.playerIn.price,
                playerInTeamId: t.playerIn.teamId ?? 0,
            }))

            await fantasyTeamService.makeTransfer(fantasyTeamId, transfers)

            setStagedTransfers([])
            setSelectedOutPlayer(null)
            await mutateTeams()
            await mutateTransferInfo()

            toast.success(
                `${stagedTransfers.length} transfer${stagedTransfers.length > 1 ? 's' : ''} confirmed`,
            )
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to confirm transfers')
        } finally {
            setIsConfirming(false)
        }
    }, [fantasyTeamId, stagedTransfers, mutateTeams, mutateTransferInfo])

    return {
        isTransferMode,
        selectedOutPlayer,
        stagedTransfers,
        selectPlayerOut,
        selectPlayerIn,
        undoTransfer,
        confirmTransfers,
        isConfirming,
        freeRemaining,
        pointsCost,
        transferInfo,
    }
}

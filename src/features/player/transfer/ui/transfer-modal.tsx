'use client'

import { AiBrain01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import { useState } from 'react'

import { useTransferSuggestions, TransferSuggestionsModal } from '@/features/ai'
import { useOptionalTransferMode } from '@/features/player/transfer'

import { useFantasyTeams } from '@/entities/fantasy-team'
import { generatePlayerPrice, mapApiPosition } from '@/entities/players'
import type { SelectedPlayer } from '@/entities/players'
import { useTeamPlayers } from '@/entities/team'
import type { ISquadPlayer } from '@/entities/team/model/team.types'

import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { ScrollArea } from '@/shared/ui/scroll-area'

interface TransferModalProps {
    open: boolean
    onClose: () => void
    squad: SelectedPlayer[]
}

const positionBadgeClass: Record<string, string> = {
    Goalkeeper: 'bg-amber-100 text-amber-800',
    Defender: 'bg-blue-100 text-blue-800',
    Midfielder: 'bg-emerald-100 text-emerald-800',
    Attacker: 'bg-rose-100 text-rose-800',
    GK: 'bg-amber-100 text-amber-800',
    DEF: 'bg-blue-100 text-blue-800',
    MID: 'bg-emerald-100 text-emerald-800',
    FWD: 'bg-rose-100 text-rose-800',
}

export const TransferModal = ({ open, onClose, squad }: TransferModalProps) => {
    const transferCtx = useOptionalTransferMode()
    const { playersByTeam } = useTeamPlayers()
    const { fantasyTeams } = useFantasyTeams()
    const [searchName, setSearchName] = useState('')
    const [filterPosition, setFilterPosition] = useState('')

    const fantasyTeamId = fantasyTeams?.[0]?.id
    const aiSuggestions = useTransferSuggestions(fantasyTeamId)

    if (!transferCtx) return null

    const {
        selectedOutPlayer,
        stagedTransfers,
        selectPlayerOut,
        selectPlayerIn,
        undoTransfer,
        confirmTransfers,
        isConfirming,
        pointsCost,
        transferInfo,
    } = transferCtx

    const stagedInIds = new Set(stagedTransfers.map((t) => t.playerIn.id))
    const stagedOutIds = new Set(stagedTransfers.map((t) => t.playerOut.id))

    // Filter available players from Explorer data
    const allAvailablePlayers: (ISquadPlayer & { teamId: number })[] = []

    for (const [teamId, players] of Object.entries(playersByTeam)) {
        for (const p of players) {
            allAvailablePlayers.push({ ...p, teamId: Number(teamId) })
        }
    }

    const squadExternalIds = new Set(squad.map((p) => p.id))

    const filteredReplacements = allAvailablePlayers.filter((p) => {
        if (squadExternalIds.has(p.id) && !stagedOutIds.has(p.id)) return false

        if (stagedInIds.has(p.id)) return false

        if (searchName && !p.name.toLowerCase().includes(searchName.toLowerCase())) return false

        if (filterPosition && mapApiPosition(p.position) !== filterPosition) return false

        return true
    })

    const handleSelectIn = (player: ISquadPlayer, teamId: number) => {
        const position = mapApiPosition(player.position)
        const price = generatePlayerPrice(player.id, position)

        selectPlayerIn({
            id: player.id,
            name: player.name,
            position,
            teamId,
            price,
            photo: player.photo,
        })
    }

    const handleConfirmAndClose = async () => {
        await confirmTransfers()
        onClose()
    }

    const positions = ['GK', 'DEF', 'MID', 'FWD'] as const

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="p-0 max-w-4xl! max-h-[90vh] overflow-x-hidden">
                <DialogHeader className="px-6 pt-5 pb-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle>Make Transfers</DialogTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={aiSuggestions.isLoading || !aiSuggestions.canAfford}
                            onClick={aiSuggestions.requestAnalysis}
                        >
                            <HugeiconsIcon icon={AiBrain01Icon} size={14} />
                            {aiSuggestions.isLoading
                                ? 'Analyzing...'
                                : `AI Suggestions (${aiSuggestions.cost})`}
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex flex-col overflow-hidden h-full">
                    {/* Transfer info bar */}
                    <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b text-sm">
                        <div className="flex items-center gap-4">
                            <span>
                                Free transfers:{' '}
                                <span className="font-semibold">{transferInfo?.freeTransfers ?? 1}</span>
                            </span>
                            <span>
                                Made:{' '}
                                <span className="font-semibold">
                                    {(transferInfo?.transfersMade ?? 0) + stagedTransfers.length}
                                </span>
                            </span>
                        </div>
                        {pointsCost > 0 && (
                            <span className="text-destructive font-medium">-{pointsCost} pts</span>
                        )}
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Left: Current squad */}
                        <div className="w-1/2 border-r flex flex-col overflow-hidden">
                            <div className="px-4 py-3 border-b">
                                <p className="text-sm font-semibold">Your Squad</p>
                                <p className="text-xs text-muted-foreground">
                                    {selectedOutPlayer
                                        ? `Replacing ${selectedOutPlayer.name}...`
                                        : 'Click a player to transfer out'}
                                </p>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-3 space-y-1">
                                    {squad.map((player) => {
                                        const isOut = stagedOutIds.has(player.id)
                                        const isSelected = selectedOutPlayer?.id === player.id

                                        return (
                                            <button
                                                key={player.id}
                                                disabled={isOut}
                                                onClick={() => selectPlayerOut(player)}
                                                className={cn(
                                                    'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all',
                                                    isSelected &&
                                                        'ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-950/20',
                                                    isOut && 'opacity-30 line-through',
                                                    !isOut && !isSelected && 'hover:bg-muted/50',
                                                )}
                                            >
                                                <Image
                                                    src={player.photo}
                                                    alt={player.name}
                                                    width={32}
                                                    height={32}
                                                    className="size-8 rounded-full object-cover"
                                                />
                                                <span className="flex-1 font-medium">{player.name}</span>
                                                <Badge className={positionBadgeClass[player.position]}>
                                                    {player.position}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {player.price}m
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Right: Available replacements */}
                        <div className="w-1/2 flex flex-col overflow-hidden">
                            <div className="px-4 py-3 border-b space-y-2">
                                <p className="text-sm font-semibold">Available Players</p>
                                <Input
                                    placeholder="Search player..."
                                    value={searchName}
                                    onChange={(e) => setSearchName(e.target.value)}
                                    className="h-7 text-xs"
                                />
                                <div className="flex gap-1">
                                    {positions.map((pos) => (
                                        <Badge
                                            key={pos}
                                            className={cn(
                                                'cursor-pointer text-xs',
                                                positionBadgeClass[pos],
                                                filterPosition === pos
                                                    ? 'ring-2 ring-ring'
                                                    : 'opacity-50 hover:opacity-80',
                                            )}
                                            onClick={() =>
                                                setFilterPosition(filterPosition === pos ? '' : pos)
                                            }
                                        >
                                            {pos}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-3 space-y-1">
                                    {!selectedOutPlayer && (
                                        <p className="text-xs text-muted-foreground text-center py-8">
                                            Select a player from your squad first
                                        </p>
                                    )}
                                    {selectedOutPlayer && filteredReplacements.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-8">
                                            No players found. Select teams in Team Builder first.
                                        </p>
                                    )}
                                    {selectedOutPlayer &&
                                        filteredReplacements.map((player) => (
                                            <button
                                                key={player.id}
                                                onClick={() => handleSelectIn(player, player.teamId)}
                                                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all"
                                            >
                                                <Image
                                                    src={player.photo}
                                                    alt={player.name}
                                                    width={32}
                                                    height={32}
                                                    className="size-8 rounded-full object-cover"
                                                />
                                                <span className="flex-1 font-medium">{player.name}</span>
                                                <Badge className={positionBadgeClass[player.position]}>
                                                    {mapApiPosition(player.position)}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {generatePlayerPrice(
                                                        player.id,
                                                        mapApiPosition(player.position),
                                                    )}
                                                    m
                                                </span>
                                            </button>
                                        ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Staged transfers + confirm */}
                    {stagedTransfers.length > 0 && (
                        <div className="border-t px-6 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold">
                                    Pending Transfers ({stagedTransfers.length})
                                </p>
                                {pointsCost > 0 && (
                                    <Badge variant="destructive">-{pointsCost} pts deduction</Badge>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {stagedTransfers.map((t, i) => (
                                    <Card key={i} className="flex-1 min-w-48 py-0">
                                        <CardContent className="flex items-center gap-2 px-3 py-2 text-sm">
                                            <span className="text-destructive font-medium">
                                                {t.playerOut.name}
                                            </span>
                                            <span className="text-muted-foreground">&rarr;</span>
                                            <span className="text-emerald-600 font-medium">
                                                {t.playerIn.name}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                className="ml-auto"
                                                onClick={() => undoTransfer(i)}
                                            >
                                                Undo
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            <Button
                                className="w-full"
                                size="lg"
                                disabled={isConfirming}
                                onClick={handleConfirmAndClose}
                            >
                                {isConfirming
                                    ? 'Confirming...'
                                    : `Confirm ${stagedTransfers.length} Transfer${stagedTransfers.length > 1 ? 's' : ''}`}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>

            <TransferSuggestionsModal
                open={aiSuggestions.isOpen}
                onClose={aiSuggestions.closeModal}
                analysis={aiSuggestions.analysis}
                isLoading={aiSuggestions.isLoading}
            />
        </Dialog>
    )
}

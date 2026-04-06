'use client'

import { createContext, useContext } from 'react'

import type { IStagedTransfer, ITransferInfo } from '@/entities/fantasy-team'
import type { SelectedPlayer } from '@/entities/players'

interface TransferModeContextValue {
    isTransferMode: boolean
    selectedOutPlayer: SelectedPlayer | null
    stagedTransfers: IStagedTransfer[]
    selectPlayerOut: (player: SelectedPlayer) => void
    selectPlayerIn: (player: SelectedPlayer) => void
    undoTransfer: (index: number) => void
    confirmTransfers: () => Promise<void>
    isConfirming: boolean
    freeRemaining: number
    pointsCost: number
    transferInfo: ITransferInfo | undefined
}

export const TransferModeContext = createContext<TransferModeContextValue | null>(null)

export const TransferModeProvider = TransferModeContext.Provider

export const useTransferModeContext = () => {
    const ctx = useContext(TransferModeContext)

    if (!ctx) throw new Error('useTransferModeContext must be used within TransferModeProvider')

    return ctx
}

export const useOptionalTransferMode = () => useContext(TransferModeContext)

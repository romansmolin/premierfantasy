import { create } from 'zustand'

import { BUDGET_TOTAL } from './player-selection.validation'

import type { PlayerPosition, SelectedPlayer } from './player.types'

interface PlayersStorageState {
    selectedPlayers: SelectedPlayer[]
}

interface PlayersStorageActions {
    addPlayer: (player: SelectedPlayer) => void
    removePlayer: (playerId: number) => void
    clearPlayers: () => void
    initPlayers: (players: SelectedPlayer[]) => void
}

type PlayersStorage = PlayersStorageState & PlayersStorageActions

const initialState: PlayersStorageState = {
    selectedPlayers: [],
}

export const usePlayersStorage = create<PlayersStorage>()((set) => ({
    ...initialState,
    addPlayer: (player) =>
        set((state) => ({
            selectedPlayers: [...state.selectedPlayers, player],
        })),
    removePlayer: (playerId) =>
        set((state) => ({
            selectedPlayers: state.selectedPlayers.filter((p) => p.id !== playerId),
        })),
    clearPlayers: () => set(initialState),
    initPlayers: (players) => set({ selectedPlayers: players }),
}))

export const selectSelectedPlayerIds = (state: PlayersStorage) => state.selectedPlayers.map((p) => p.id)

export const selectBudgetLeft = (state: PlayersStorage) =>
    BUDGET_TOTAL - state.selectedPlayers.reduce((sum, p) => sum + p.price, 0)

export const selectPositionCounts = (state: PlayersStorage) =>
    state.selectedPlayers.reduce(
        (counts, p) => {
            counts[p.position] = (counts[p.position] || 0) + 1

            return counts
        },
        {} as Record<PlayerPosition, number>,
    )

export const selectTeamCounts = (state: PlayersStorage) =>
    state.selectedPlayers.reduce(
        (counts, p) => {
            counts[p.teamId] = (counts[p.teamId] || 0) + 1

            return counts
        },
        {} as Record<number, number>,
    )

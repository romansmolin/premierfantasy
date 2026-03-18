import { create } from 'zustand'

interface TeamsStoreState {
    selectedTeamsIds: number[]
    selectTeam: (id: number) => void
    clearSelectedTeams: () => void
}

const initialState = {
    selectedTeamsIds: [],
}

export const useTeamsStore = create<TeamsStoreState>((set) => ({
    ...initialState,
    selectTeam: (id: number) =>
        set((state) => ({
            selectedTeamsIds: state.selectedTeamsIds.includes(id)
                ? state.selectedTeamsIds.filter((teamId) => teamId !== id)
                : [...state.selectedTeamsIds, id],
        })),
    clearSelectedTeams: () => set(() => ({ selectedTeamsIds: [] })),
}))

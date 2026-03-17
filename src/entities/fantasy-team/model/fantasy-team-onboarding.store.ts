import { create } from 'zustand'

interface OnboardingState {
    isOnboardingOpen: boolean
}

interface OnboardingActions {
    openOnboarding: () => void
    closeOnboarding: () => void
}

export const useFantasyTeamOnboardingStore = create<OnboardingState & OnboardingActions>()((set) => ({
    isOnboardingOpen: false,

    openOnboarding: () => set({ isOnboardingOpen: true }),
    closeOnboarding: () => set({ isOnboardingOpen: false }),
}))

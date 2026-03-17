'use client'

import { FantasyTeamDialogOnboardingButton } from '@/features/fantasy-team'

import { useFantasyTeams } from '@/entities/fantasy-team'

export const FantasyTeamGrid = () => {
    const { fantasyTeams } = useFantasyTeams()

    if (fantasyTeams?.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="max-w-lg border border-dashed p-8 text-center flex items-center justify-center flex-col gap-5 rounded-2xl">
                    <h2 className="font-audiowide text-2xl">You Have No Fantasy Team Yet</h2>
                    <p>
                        In order to join competitions you have to create your own fantasy team of 11 best
                        players
                    </p>
                    <FantasyTeamDialogOnboardingButton />
                </div>
            </div>
        )
    }

    return <div>FantasyTeamGrid</div>
}

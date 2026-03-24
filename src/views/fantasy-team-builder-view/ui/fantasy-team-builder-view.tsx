'use client'

import { FantasyTeamField, useHydrateSquad } from '@/features/fantasy-team'
import { PlayersExplorer, SelectionSummary } from '@/features/player'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

export const FantasyTeamBuilderView = () => {
    useHydrateSquad()

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex flex-col gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Fantasy Team Builder</h2>
                    <p className="text-sm text-muted-foreground">Overview of your fantasy football stats.</p>
                </div>

                <div className="flex w-full gap-3">
                    <Card className="flex-2 min-w-0 overflow-hidden">
                        <CardHeader>
                            <CardTitle>Players Explorer</CardTitle>
                            <CardDescription>
                                Select teams where your desired players are playing
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <PlayersExplorer />
                        </CardContent>
                    </Card>

                    <div className="flex-1 flex flex-col gap-3">
                        <Card>
                            <CardHeader>
                                <CardTitle>Squad Builder</CardTitle>
                                <CardDescription>Your selected players in formation</CardDescription>
                            </CardHeader>

                            <CardContent>
                                <FantasyTeamField />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Selection Summary</CardTitle>
                                <CardDescription>
                                    Your squad budget, positions, and selected players
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <SelectionSummary />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

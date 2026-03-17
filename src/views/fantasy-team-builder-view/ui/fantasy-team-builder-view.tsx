import React from 'react'

import { TeamExplorer } from '@/features/team'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

export const FantasyTeamBuilderView = () => {
    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex flex-col gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Fantasy Team Builder</h2>
                    <p className="text-sm text-muted-foreground">Overview of your fantasy football stats.</p>
                </div>

                <div className="flex w-full gap-3">
                    <div className="flex flex-1 flex-col gap-3">
                        <Card className="flex-1">
                            <CardHeader>
                                <CardTitle>Team Explore</CardTitle>
                                <CardDescription>
                                    Select teams where your desired players are playing
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <TeamExplorer />
                            </CardContent>
                        </Card>

                        <Card className="flex-1">
                            <CardHeader>
                                <CardTitle>Team Explore</CardTitle>
                                <CardDescription>
                                    Select teams where your desired players are playing
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <TeamExplorer />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

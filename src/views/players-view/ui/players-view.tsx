import { PlayersExplorer } from '@/features/player'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

export function PlayersView() {
    return (
        <Card className="min-w-0 overflow-hidden">
            <CardHeader>
                <CardTitle>Players</CardTitle>
                <CardDescription>
                    Pick clubs, filter players and open a profile. AI player analysis is available there for
                    Credits.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <PlayersExplorer />
            </CardContent>
        </Card>
    )
}

'use client'

import type { LivePlayerPoints } from '@/entities/gameweek/model/gameweek-live.types'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

interface LivePointsFeedProps {
    players: LivePlayerPoints[]
}

export const LivePointsFeed = ({ players }: LivePointsFeedProps) => {
    const allEvents = players
        .flatMap((p) =>
            p.events.map((e) => ({
                ...e,
                playerName: p.name,
            })),
        )
        .sort((a, b) => b.minute - a.minute)

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm">Live Points Feed</CardTitle>
            </CardHeader>
            <CardContent>
                {allEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events yet.</p>
                ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {allEvents.map((event, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground w-8">{event.minute}&apos;</span>
                                <span>{event.type}</span>
                                <span className="font-medium">{event.playerName}</span>
                                <span className={event.points > 0 ? 'text-green-500' : 'text-destructive'}>
                                    {event.points > 0 ? '+' : ''}
                                    {event.points} pts
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

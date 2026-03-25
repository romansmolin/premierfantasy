'use client'

import type { LiveFixtureResult } from '@/entities/gameweek/model/gameweek-live.types'

import { Badge } from '@/shared/ui/badge'
import { ScrollArea, ScrollBar } from '@/shared/ui/scroll-area'

interface LiveMatchTickerProps {
    fixtures: LiveFixtureResult[]
}

const statusColor: Record<string, string> = {
    NS: 'text-muted-foreground',
    '1H': 'text-green-500',
    HT: 'text-yellow-500',
    '2H': 'text-green-500',
    FT: 'text-muted-foreground',
}

export const LiveMatchTicker = ({ fixtures }: LiveMatchTickerProps) => {
    return (
        <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2">
                {fixtures.map((fixture) => (
                    <Badge
                        key={fixture.fixtureId}
                        variant="outline"
                        className="flex items-center gap-2 px-3 py-2 whitespace-nowrap"
                    >
                        <span>{fixture.homeTeam}</span>
                        <span className={`font-bold ${statusColor[fixture.status] ?? ''}`}>
                            {fixture.score}
                        </span>
                        <span>{fixture.awayTeam}</span>
                        <span className="text-xs text-muted-foreground">({fixture.status})</span>
                    </Badge>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    )
}

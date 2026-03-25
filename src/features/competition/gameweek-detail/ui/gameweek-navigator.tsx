'use client'

import { Button } from '@/shared/ui/button'
import { ScrollArea, ScrollBar } from '@/shared/ui/scroll-area'

interface GameweekNavigatorProps {
    startGameweek: number
    endGameweek: number
    currentGameweek: number
    onSelect: (gw: number) => void
}

export const GameweekNavigator = ({
    startGameweek,
    endGameweek,
    currentGameweek,
    onSelect,
}: GameweekNavigatorProps) => {
    const gameweeks = Array.from({ length: endGameweek - startGameweek + 1 }, (_, i) => startGameweek + i)

    return (
        <ScrollArea className="w-full">
            <div className="flex gap-1 pb-2">
                {gameweeks.map((gw) => (
                    <Button
                        key={gw}
                        variant={gw === currentGameweek ? 'default' : 'outline'}
                        size="sm"
                        className="min-w-10"
                        onClick={() => onSelect(gw)}
                    >
                        {gw}
                    </Button>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    )
}

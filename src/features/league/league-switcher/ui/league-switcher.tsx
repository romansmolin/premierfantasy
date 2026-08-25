'use client'

import Image from 'next/image'

import type { IMyLeague } from '@/entities/league'

import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ScrollArea, ScrollBar } from '@/shared/ui/scroll-area'

interface LeagueSwitcherProps {
    leagues: IMyLeague[]
    selectedMembershipId: string | null
    onSelect: (league: IMyLeague) => void
    /** Marks leagues the user already has a team in. */
    showTeamState?: boolean
    className?: string
}

/**
 * Horizontal pills across the leagues a user has joined. Presentational — the
 * caller owns what "selected" means (local state, a query param, a route).
 */
export const LeagueSwitcher = ({
    leagues,
    selectedMembershipId,
    onSelect,
    showTeamState = false,
    className,
}: LeagueSwitcherProps) => {
    if (leagues.length <= 1) return null

    return (
        <ScrollArea className={cn('w-full', className)}>
            <div className="flex gap-2 pb-2">
                {leagues.map((league) => {
                    const isSelected = league.membershipId === selectedMembershipId
                    const hasTeam = !!league.fantasyTeam

                    return (
                        <Button
                            key={league.membershipId}
                            size="sm"
                            variant={isSelected ? 'default' : 'outline'}
                            className="shrink-0 gap-2"
                            onClick={() => onSelect(league)}
                        >
                            {league.league.logo && (
                                <Image
                                    src={league.league.logo}
                                    alt=""
                                    width={16}
                                    height={16}
                                    className={cn(
                                        'size-4 shrink-0 rounded-sm bg-white object-contain',
                                        isSelected ? '' : 'opacity-80',
                                    )}
                                    unoptimized
                                />
                            )}
                            {league.league.name}
                            {showTeamState && (
                                <Badge
                                    variant={isSelected ? 'secondary' : 'outline'}
                                    className="ml-0.5 text-[10px] font-normal"
                                >
                                    {hasTeam
                                        ? league.fantasyTeam?.isComplete
                                            ? 'Team'
                                            : `${league.fantasyTeam?.playerCount}/11`
                                        : 'New'}
                                </Badge>
                            )}
                        </Button>
                    )
                })}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    )
}

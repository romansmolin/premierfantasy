'use client'

import Image from 'next/image'

import { useTeamsStore, useAllTeams } from '@/entities/team'

import { cn } from '@/shared/lib/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

export const TeamExplorer = () => {
    const { teams } = useAllTeams()
    const { selectedTeamsIds, selectTeam } = useTeamsStore()

    return (
        <div className="grid grid-cols-10 gap-3">
            {teams.map(({ team }) => (
                <Card
                    key={team.code}
                    onClick={() => selectTeam(team.id)}
                    className={cn(
                        'flex items-center justify-between hover:bg-primary duration-300 cursor-pointer',
                        selectedTeamsIds.includes(team.id) && 'bg-primary',
                    )}
                >
                    <CardContent className="size-18 flex items-center justify-between">
                        <Image
                            src={team.logo}
                            alt={`${team.name} logo`}
                            width={300}
                            height={300}
                            className="object-cover"
                        />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

const SKELETON_COUNT = 20

export const TeamExplorerSkeleton = () => (
    <div className="grid grid-cols-8 gap-3">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <Skeleton key={i} className="size-22 flex items-center justify-center"></Skeleton>
        ))}
    </div>
)

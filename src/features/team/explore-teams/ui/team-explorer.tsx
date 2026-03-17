'use client'

import Image from 'next/image'

import { useAllTeams } from '@/entities/teams'

import { Card, CardContent } from '@/shared/ui/card'

export const TeamExplorer = () => {
    const { teams, isLoading, error } = useAllTeams()

    if (isLoading || !teams) {
        return null
    }

    if (error) return null

    return (
        <div className="grid grid-cols-8 gap-3">
            {teams.map(({ team }) => (
                <Card
                    key={team.code}
                    className="flex items-center justify-between hover:bg-primary duration-300 cursor-pointer"
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

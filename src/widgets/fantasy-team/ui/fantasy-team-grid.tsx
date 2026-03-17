'use client'

import { PlusSignCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { useFantasyTeams } from '@/entities/fantasy-team'

import { Button } from '@/shared/ui/button'

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
                    <Button size={'lg'}>
                        <Link href={'/fantasy-team-builder'} className="flex gap-2 items-center">
                            <HugeiconsIcon icon={PlusSignCircleIcon} />
                            Create Fantasy Team
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    return <div>FantasyTeamGrid</div>
}

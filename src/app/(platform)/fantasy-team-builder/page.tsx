import { Suspense } from 'react'

import { FantasyTeamBuilderView } from '@/views/fantasy-team-builder-view'

import { Skeleton } from '@/shared/ui/skeleton'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Team Builder',
    description:
        'Pick your 15-player squad within budget, set your formation, and choose a captain before the deadline.',
}

export default function FantasyTeamBuilder() {
    return (
        <Suspense fallback={<Skeleton className="h-96" />}>
            <FantasyTeamBuilderView />
        </Suspense>
    )
}

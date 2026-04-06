import { Suspense } from 'react'

import { FantasyTeamBuilderView } from '@/views/fantasy-team-builder-view'

import { Skeleton } from '@/shared/ui/skeleton'

export default function FantasyTeamBuilder() {
    return (
        <Suspense fallback={<Skeleton className="h-96" />}>
            <FantasyTeamBuilderView />
        </Suspense>
    )
}

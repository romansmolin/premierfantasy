import { Suspense } from 'react'

import { PlayersView } from '@/views/players-view'

import { Skeleton } from '@/shared/ui/skeleton'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Players',
    description: 'Browse Premier League players and clubs, and get AI player analysis with Credits.',
}

export default function PlayersPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96" />}>
            <PlayersView />
        </Suspense>
    )
}

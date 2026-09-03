import { CompetitionDetailView } from '@/views/competition-detail-view'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Competition',
    description: 'Standings, gameweek breakdown, and prize payouts for this rolling competition.',
}

export default function CompetitionDetailPage() {
    return <CompetitionDetailView />
}

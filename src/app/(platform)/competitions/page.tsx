import { CompetitionsView } from '@/views/competitions-view'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Competitions',
    description:
        'Browse active and upcoming rolling 5-gameweek competitions, check join deadlines, and enter your squad.',
}

export default function CompetitionsPage() {
    return <CompetitionsView />
}

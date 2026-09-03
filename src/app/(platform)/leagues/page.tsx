import { LeaguesBrowserView } from '@/views/leagues-browser'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Leagues',
    description:
        'Browse, join, and create private leagues to compete against friends across multiple competitions.',
}

export default function LeaguesPage() {
    return <LeaguesBrowserView />
}

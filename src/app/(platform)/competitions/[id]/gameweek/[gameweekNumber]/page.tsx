import { GameweekDetailView } from '@/views/gameweek-detail-view'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Gameweek Detail',
    description: 'Per-player points, captaincy, and bench returns for your squad in this gameweek.',
}

export default function GameweekDetailPage() {
    return <GameweekDetailView />
}

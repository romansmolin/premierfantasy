import { LiveGameweekView } from '@/views/live-gameweek-view'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Live Gameweek',
    description:
        'Follow live points as Premier League fixtures play out and the competition table shifts in real time.',
}

export default function LiveGameweekPage() {
    return <LiveGameweekView />
}

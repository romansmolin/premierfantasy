import { ScoutListView } from '@/views/scout-view'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Scout',
    description: 'Compare Premier League players by form, value and chances.',
}

export default function ScoutPage() {
    return <ScoutListView />
}

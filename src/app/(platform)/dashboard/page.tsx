import { DashboardView } from '@/views/dashboard-view'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Dashboard',
    description:
        'Your fantasy football overview — active competition, squad status, Coin balance, and recent results.',
}

export default function Dashboard() {
    return <DashboardView />
}

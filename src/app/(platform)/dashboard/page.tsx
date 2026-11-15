import { DashboardView } from '@/views/dashboard-view'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Dashboard',
    description: 'Upcoming fixtures, your Credit balance and quick access to AI match predictions.',
}

export default function Dashboard() {
    return <DashboardView />
}

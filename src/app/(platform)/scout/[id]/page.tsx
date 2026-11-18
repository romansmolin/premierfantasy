import { ScoutProfileView } from '@/views/scout-view'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Scout player' }

export default async function ScoutPlayerPage({ params }: { params: Promise<{ id: string }> }) {
    return <ScoutProfileView id={(await params).id} />
}

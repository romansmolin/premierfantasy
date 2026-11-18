import { ScoutCompareView } from '@/views/scout-view'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Compare players' }

export default async function ScoutComparePage({
    searchParams,
}: {
    searchParams: Promise<{ ids?: string }>
}) {
    return <ScoutCompareView ids={(await searchParams).ids ?? ''} />
}

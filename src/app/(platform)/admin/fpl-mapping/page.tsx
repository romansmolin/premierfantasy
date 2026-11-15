import { FplMappingView } from '@/views/fpl-mapping-view'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'FPL matches',
    description: 'Admin page to review FPL player matches.',
    robots: { index: false, follow: false },
}

export default function FplMappingPage() {
    return <FplMappingView />
}

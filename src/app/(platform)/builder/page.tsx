import { BuilderView } from '@/views/builder-view'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Squad builder',
    description:
        'Build a squad that follows the FPL rules: budget, positions, club limit, formation, captain.',
}

export default function BuilderPage() {
    return <BuilderView />
}

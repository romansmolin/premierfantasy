import { FixturesView } from '@/views/stats'

import { getFixturesCached } from '../_lib/stats-cache'

import type { Metadata } from 'next'

// Reads the database: render per request (data itself is cached for an hour), never at build time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Premier League fixtures for the next gameweek',
    description: 'Kick-off times of the next Premier League gameweek.',
    alternates: { canonical: '/fixtures' },
}

export default async function FixturesPage() {
    return <FixturesView data={await getFixturesCached()} />
}

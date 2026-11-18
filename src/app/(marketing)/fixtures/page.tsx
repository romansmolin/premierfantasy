import { FixturesView } from '@/views/stats'

import { getFixturesCached, getHeatmapCached } from '../_lib/stats-cache'

import type { Metadata } from 'next'

// Reads the database: render per request (data itself is cached for an hour), never at build time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Premier League fixtures for the next gameweek',
    description:
        'Kick-offs and win chances of the next Premier League gameweek, plus a forecast heatmap of the next eight gameweeks.',
    alternates: { canonical: '/fixtures' },
}

export default async function FixturesPage({ searchParams }: { searchParams: Promise<{ metric?: string }> }) {
    const { metric } = await searchParams
    const [fixtures, heatmap] = await Promise.all([getFixturesCached(), getHeatmapCached()])

    return <FixturesView data={fixtures} heatmap={heatmap} metric={metric === 'cs' ? 'cs' : 'xg'} />
}

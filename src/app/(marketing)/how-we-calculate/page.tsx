import { MethodView } from '@/views/stats'

import { getForecastStatusCached } from '../_lib/stats-cache'

import type { Metadata } from 'next'

// Reads the database: render per request (data itself is cached for an hour), never at build time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'How we calculate the points forecast',
    description:
        'How the Premier Fantasy forecast works and how accurate it has been against real FPL points.',
    alternates: { canonical: '/how-we-calculate' },
}

export default async function HowWeCalculatePage() {
    return <MethodView status={await getForecastStatusCached()} />
}

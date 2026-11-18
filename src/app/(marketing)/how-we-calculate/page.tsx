import { MIN_BASELINE_ROWS, MIN_EXPECTED_MINUTES } from '@/server/prediction/lib/v2/evaluation'
import { DEFAULT_V2, GATE, HORIZON_MATCHES, MIN_APPEARANCES } from '@/server/prediction/lib/v2/params'

import { MethodView } from '@/views/stats'

import { getForecastStatusCached, getProbabilityStatusCached } from '../_lib/stats-cache'

import type { Metadata } from 'next'

// Reads the database: render per request (data itself is cached for an hour), never at build time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'How we calculate the points forecast',
    description:
        'How the Premier Fantasy forecast works and how accurate it has been against real FPL points.',
    alternates: { canonical: '/how-we-calculate' },
}

const params = {
    decay: DEFAULT_V2.decay,
    minutesDecay: DEFAULT_V2.minutesDecay,
    priorMinutes90: DEFAULT_V2.priorMinutes90,
    xgWeight: DEFAULT_V2.xgWeight,
    sims: DEFAULT_V2.sims,
    horizonMatches: HORIZON_MATCHES,
    minAppearances: MIN_APPEARANCES,
    minExpectedMinutes: MIN_EXPECTED_MINUTES,
    minHistoryMatches: MIN_BASELINE_ROWS,
    gate: GATE,
}

export default async function HowWeCalculatePage() {
    const [status, probability] = await Promise.all([getForecastStatusCached(), getProbabilityStatusCached()])

    return <MethodView status={status} probability={probability} params={params} />
}

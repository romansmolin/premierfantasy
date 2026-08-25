import { NextResponse } from 'next/server'

import { container } from '@/shared/lib/container'
import { isCronAuthorized } from '@/shared/lib/cron-auth'

import type { NextRequest } from 'next/server'

/**
 * Recalculates demo competitors' points across every non-finalized competition:
 * fills gameweeks that have elapsed since the last run, backfills teams seeded
 * later, and repairs any row that drifted from the deterministic value.
 */
export async function GET(req: NextRequest) {
    if (!isCronAuthorized(req.headers.get('authorization'))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const result = await container.demoCompetitionService.recalculateAllDemoScores()

        if (result.errors.length > 0) {
            console.error('Demo score recalculation errors:', result.errors)
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Demo score recalculation failed:', error)

        return NextResponse.json({ error: 'Recalculation failed' }, { status: 500 })
    }
}

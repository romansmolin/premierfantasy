import { NextResponse } from 'next/server'

import { container } from '@/shared/lib/container'
import { isCronAuthorized } from '@/shared/lib/cron-auth'

import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    if (!isCronAuthorized(req.headers.get('authorization'))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        await container.competitionService.transitionCompetitions()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to transition competitions:', error)

        return NextResponse.json({ error: 'Failed to transition competitions' }, { status: 500 })
    }
}

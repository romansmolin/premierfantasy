import { NextResponse } from 'next/server'

import { container } from '@/shared/lib/container'
import { isCronAuthorized } from '@/shared/lib/cron-auth'

import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    if (!isCronAuthorized(req.headers.get('authorization'))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const result = await container.demoCompetitionService.processCompetitions()

        if (result.errors.length > 0) {
            console.error('Demo competition processing errors:', result.errors)
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Demo competition processing failed:', error)

        return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
}

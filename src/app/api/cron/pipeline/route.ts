import { NextResponse } from 'next/server'

import { container } from '@/shared/lib/container'
import { isCronAuthorized } from '@/shared/lib/cron-auth'

import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    if (!isCronAuthorized(req.headers.get('authorization'))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const result = await container.orchestratorService.runPipeline()

        return NextResponse.json(result)
    } catch (error) {
        console.error('Pipeline failed:', error)

        return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 })
    }
}

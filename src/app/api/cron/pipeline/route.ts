import { NextResponse } from 'next/server'

import { container } from '@/shared/lib/container'

import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization')

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

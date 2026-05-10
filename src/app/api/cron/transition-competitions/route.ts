import { NextResponse } from 'next/server'

import { container } from '@/shared/lib/container'

import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization')

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

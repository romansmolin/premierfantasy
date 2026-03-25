import { NextResponse } from 'next/server'
import { z } from 'zod'

import type { IScoringService } from '../service/scoring.service.interface'
import type { NextRequest } from 'next/server'

const calculateGameweekSchema = z.object({
    gameweekId: z.string().uuid(),
    season: z.number().int().min(2000).max(2100),
    leagueId: z.number().int().positive(),
})

export class ScoringController {
    private readonly scoringService: IScoringService

    constructor(scoringService: IScoringService) {
        this.scoringService = scoringService
    }

    async calculateGameweek(req: NextRequest) {
        const body: unknown = await req.json()
        const parsed = calculateGameweekSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }

        try {
            await this.scoringService.calculateGameweek(
                parsed.data.gameweekId,
                parsed.data.season,
                parsed.data.leagueId,
            )

            return NextResponse.json({ success: true })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to calculate gameweek'

            return NextResponse.json({ error: message }, { status: 500 })
        }
    }
}

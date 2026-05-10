import { z } from 'zod'

import { parseJson, withController } from '@/shared/lib/http'

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

    calculateGameweek = withController(async (req: NextRequest) => {
        const data = await parseJson(req, calculateGameweekSchema)

        await this.scoringService.calculateGameweek(data.gameweekId, data.season, data.leagueId)

        return { success: true }
    })
}

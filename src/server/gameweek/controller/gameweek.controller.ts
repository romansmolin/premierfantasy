import { NextResponse } from 'next/server'
import { z } from 'zod'

import { syncGameweeksSchema } from '@/entities/gameweek/model/gameweek.schema'

import { Errors, parseJson, withController } from '@/shared/lib/http'

import type { IGameweekService } from '../service/gameweek.service.interface'

const activateGameweekSchema = z.object({
    gameweekNumber: z.number().int().positive(),
})

export class GameweekController {
    private readonly gameweekService: IGameweekService

    constructor(gameweekService: IGameweekService) {
        this.gameweekService = gameweekService
    }

    getAll = withController(async () => {
        return this.gameweekService.getAllGameweeks()
    })

    getActive = withController(async () => {
        const gameweek = await this.gameweekService.getActiveGameweek()

        if (!gameweek) throw Errors.notFound('No active gameweek')

        return gameweek
    })

    activate = withController(async (req) => {
        const { gameweekNumber } = await parseJson(req, activateGameweekSchema)

        return this.gameweekService.activateGameweek(gameweekNumber)
    })

    sync = withController(async (req) => {
        const data = await parseJson(req, syncGameweeksSchema)
        const gameweeks = await this.gameweekService.syncFromApi(data.season, data.leagueId)

        return NextResponse.json(gameweeks, { status: 201 })
    })
}

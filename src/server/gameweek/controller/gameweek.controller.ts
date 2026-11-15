import { Errors, withController } from '@/shared/lib/http'

import type { IGameweekService } from '../service/gameweek.service.interface'

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
}

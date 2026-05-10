import { withController } from '@/shared/lib/http'

import type { ILeagueService } from '../service/league.service.interface'

export class LeagueController {
    private readonly leagueService: ILeagueService

    constructor(leagueService: ILeagueService) {
        this.leagueService = leagueService
    }

    getBrowser = withController(async () => {
        return this.leagueService.getBrowser()
    })
}

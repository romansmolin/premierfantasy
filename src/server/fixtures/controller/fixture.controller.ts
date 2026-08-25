import { z } from 'zod'

import { LEAGUE_ID, SEASON } from '@/shared/config/league'
import { parseQuery, withController } from '@/shared/lib/http'

import type { IFixtureService } from '../service/fixture.service.interface'

const upcomingQuerySchema = z.object({
    count: z.coerce.number().int().positive().max(50).default(20),
    leagueId: z.coerce.number().int().positive().default(LEAGUE_ID),
    season: z.coerce.number().int().positive().default(SEASON),
})

/** `leagues=39:2026,140:2026` — a season per league, since seasons differ by country. */
const nextQuerySchema = z.object({
    leagues: z
        .string()
        .min(1)
        .transform((raw) =>
            raw
                .split(',')
                .map((pair) => {
                    const [leagueRaw, seasonRaw] = pair.split(':')

                    return {
                        leagueExternalId: Number(leagueRaw?.trim()),
                        season: Number(seasonRaw?.trim() ?? SEASON),
                    }
                })
                .filter(
                    (ref) =>
                        Number.isInteger(ref.leagueExternalId) &&
                        ref.leagueExternalId > 0 &&
                        Number.isInteger(ref.season) &&
                        ref.season > 0,
                ),
        ),
    perLeague: z.coerce.number().int().positive().max(10).default(1),
})

export class FixtureController {
    private readonly fixtureService: IFixtureService

    constructor(fixtureService: IFixtureService) {
        this.fixtureService = fixtureService
    }

    getUpcoming = withController(async (req) => {
        const { count, leagueId, season } = parseQuery(req, upcomingQuerySchema)

        return this.fixtureService.getUpcoming(leagueId, season, count)
    })

    getNextForLeagues = withController(async (req) => {
        const { leagues, perLeague } = parseQuery(req, nextQuerySchema)

        if (leagues.length === 0) return []

        return this.fixtureService.getNextForLeagues(leagues, perLeague)
    })
}

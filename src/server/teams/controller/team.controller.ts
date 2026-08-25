import { z } from 'zod'

import { LEAGUE_ID, SEASON } from '@/shared/config/league'
import { Errors, parseQuery, withController } from '@/shared/lib/http'

import type { ITeamsService } from '../service/team.service.interface'

const teamStatisticsQuerySchema = z.object({
    league: z.coerce.number().int().positive(),
    season: z.coerce.number().int().min(2000).max(2100),
})

const playerDetailsQuerySchema = z.object({
    season: z.coerce.number().int().min(2000).max(2100).optional(),
})

const allTeamsQuerySchema = z.object({
    league: z.coerce.number().int().positive().optional(),
    season: z.coerce.number().int().min(2000).max(2100).optional(),
})

const currentSeason = () => {
    const now = new Date()

    return now.getMonth() + 1 >= 8 ? now.getFullYear() : now.getFullYear() - 1
}

export class TeamController {
    private readonly teamService: ITeamsService

    constructor(teamService: ITeamsService) {
        this.teamService = teamService
    }

    getAllTeams = withController(async (req) => {
        const { league, season } = await parseQuery(req, allTeamsQuerySchema)

        return this.teamService.getAllTeams(league ?? LEAGUE_ID, season ?? SEASON)
    })

    getTeamById = withController(async (_req, ctx) => {
        const { id } = await ctx.params
        const team = await this.teamService.getTeamById(Number(id))

        if (!team) throw Errors.notFound()

        return team
    })

    getTeamPlayers = withController(async (_req, ctx) => {
        const { id } = await ctx.params

        return this.teamService.getTeamPlayers(Number(id))
    })

    getTeamStatistics = withController(async (req, ctx) => {
        const { id } = await ctx.params
        const { league, season } = parseQuery(req, teamStatisticsQuerySchema)

        const statistics = await this.teamService.getTeamStatistics(Number(id), league, season)

        if (!statistics) throw Errors.notFound()

        return statistics
    })

    getPlayerDetails = withController(async (req, ctx) => {
        const { id } = await ctx.params
        const { season } = parseQuery(req, playerDetailsQuerySchema)
        const player = await this.teamService.getPlayerDetails(Number(id), season ?? currentSeason())

        if (!player) throw Errors.notFound('Player not found')

        return player
    })
}

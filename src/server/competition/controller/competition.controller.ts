import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createCompetitionSchema } from '@/entities/competition/model/competition.schema'

import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { Errors, parseJson, withController } from '@/shared/lib/http'

import type { ICompetitionService } from '../service/competition.service.interface'

const generateCompetitionsSchema = z.object({
    totalGameweeks: z.number().int().positive().optional(),
})

export class CompetitionController {
    private readonly competitionService: ICompetitionService

    constructor(competitionService: ICompetitionService) {
        this.competitionService = competitionService
    }

    getAll = withController(async () => {
        return this.competitionService.getAllCompetitions()
    })

    getBrowser = withController(async () => {
        return this.competitionService.getCompetitionsForBrowser()
    })

    getById = withController(async (_req, ctx) => {
        const { id } = await ctx.params
        const competition = await this.competitionService.getCompetition(id)

        if (!competition) throw Errors.notFound()

        return competition
    })

    create = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const data = await parseJson(req, createCompetitionSchema)
        const competition = await this.competitionService.createCompetition(data)

        return NextResponse.json(competition, { status: 201 })
    })

    delete = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params

        await this.competitionService.deleteCompetition(id)

        return new NextResponse(null, { status: 204 })
    })

    getLeaderboard = withController(async (_req, ctx) => {
        const { id } = await ctx.params

        return this.competitionService.getLeaderboard(id)
    })

    getCompetitionState = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return this.competitionService.getCompetitionState(userId)
    })

    generateCompetitions = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { totalGameweeks } = await parseJson(req, generateCompetitionsSchema)

        await this.competitionService.generateRollingCompetitions(totalGameweeks ?? 38)

        return NextResponse.json({ success: true }, { status: 201 })
    })
}

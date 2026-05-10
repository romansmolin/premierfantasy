import { NextResponse } from 'next/server'
import { z } from 'zod'

import { saveSquadSchema } from '@/entities/players'

import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { Errors, parseJson, withController } from '@/shared/lib/http'

import type { IFantasyTeamService } from '../service/fantasy-team.service.interface'

const positionEnum = z.enum(['GK', 'DEF', 'MID', 'FWD'])

const createFantasyTeamSchema = z.object({
    competitionId: z.string().min(1),
    name: z.string().min(1),
    budgetLeft: z.number(),
})

const updateFantasyTeamSchema = z
    .object({
        name: z.string().min(1).optional(),
        budgetLeft: z.number().optional(),
        freeTransfers: z.number().int().min(0).optional(),
    })
    .strict()

const createTransferSchema = z.object({
    playerOutId: z.number().int().positive(),
    playerInId: z.number().int().positive(),
    playerInName: z.string().min(1),
    playerInPosition: positionEnum,
    playerInPrice: z.number().nonnegative(),
    playerInTeamId: z.number().int().positive(),
})

const makeTransferSchema = z.array(createTransferSchema).min(1)

export class FantasyTeamController {
    private readonly fantasyTeamService: IFantasyTeamService

    constructor(fantasyTeamService: IFantasyTeamService) {
        this.fantasyTeamService = fantasyTeamService
    }

    private async assertOwner(teamId: string, userId: string) {
        const team = await this.fantasyTeamService.getFantasyTeam(teamId)

        if (!team) throw Errors.notFound()

        if (team.userId !== userId) throw Errors.forbidden()

        return team
    }

    getAll = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return this.fantasyTeamService.getFantasyTeamsByUser(userId)
    })

    getById = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params

        return this.assertOwner(id, userId)
    })

    getByUserId = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { userId: targetUserId } = await ctx.params

        if (targetUserId !== userId) throw Errors.forbidden()

        return this.fantasyTeamService.getFantasyTeamsByUser(targetUserId)
    })

    create = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const data = await parseJson(req, createFantasyTeamSchema)
        const team = await this.fantasyTeamService.createFantasyTeam({ ...data, userId })

        return NextResponse.json(team, { status: 201 })
    })

    update = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params

        await this.assertOwner(id, userId)

        const data = await parseJson(req, updateFantasyTeamSchema)

        return this.fantasyTeamService.updateFantasyTeam(id, data)
    })

    delete = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params

        await this.assertOwner(id, userId)

        await this.fantasyTeamService.deleteFantasyTeam(id)

        return new NextResponse(null, { status: 204 })
    })

    getSquad = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params

        await this.assertOwner(id, userId)

        return this.fantasyTeamService.getSquad(id)
    })

    getSquadWithGameweekStats = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id, gameweekNumber } = await ctx.params

        await this.assertOwner(id, userId)

        return this.fantasyTeamService.getSquadWithGameweekStats(id, Number(gameweekNumber))
    })

    getTransferInfo = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params

        await this.assertOwner(id, userId)

        return this.fantasyTeamService.getTransferInfo(id)
    })

    makeTransfer = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params

        await this.assertOwner(id, userId)

        const transfers = await parseJson(req, makeTransferSchema)

        await this.fantasyTeamService.makeTransfer(id, transfers)

        return { success: true }
    })

    saveSquad = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params

        await this.assertOwner(id, userId)

        const data = await parseJson(req, saveSquadSchema)

        await this.fantasyTeamService.saveSquad(id, data.players)

        return { success: true }
    })
}

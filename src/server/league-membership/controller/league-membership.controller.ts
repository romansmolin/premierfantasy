import { NextResponse } from 'next/server'

import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { withController } from '@/shared/lib/http'

import type { ILeagueMembershipService } from '../service/league-membership.service.interface'

export class LeagueMembershipController {
    private readonly leagueMembershipService: ILeagueMembershipService

    constructor(leagueMembershipService: ILeagueMembershipService) {
        this.leagueMembershipService = leagueMembershipService
    }

    getMine = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return this.leagueMembershipService.getMyLeagues(userId)
    })

    join = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params
        const result = await this.leagueMembershipService.joinLeague(userId, id)

        return NextResponse.json(result, { status: result.alreadyMember ? 200 : 201 })
    })

    getParticipants = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { seasonId } = await ctx.params

        return this.leagueMembershipService.getParticipants(seasonId)
    })
}

import { z } from 'zod'

import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { parseJson, withController } from '@/shared/lib/http'

import type { ISquadService } from '../service/squad.service.interface'

const squadSchema = z.object({
    name: z.string().trim().min(1).max(60),
    starters: z.array(z.string().min(1)).max(20),
    bench: z.array(z.string().min(1)).max(20),
    captainId: z.string().max(100),
    viceCaptainId: z.string().max(100),
})

export class SquadController {
    private readonly service: ISquadService

    constructor(service: ISquadService) {
        this.service = service
    }

    list = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return this.service.list(userId)
    })

    create = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return this.service.create(userId, await parseJson(req, squadSchema))
    })

    get = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return this.service.get(userId, (await ctx.params).id)
    })

    update = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return this.service.update(userId, (await ctx.params).id, await parseJson(req, squadSchema))
    })

    remove = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        await this.service.remove(userId, (await ctx.params).id)

        return { ok: true }
    })
}

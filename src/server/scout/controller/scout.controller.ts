import { z } from 'zod'

import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { parseQuery, withController } from '@/shared/lib/http'

import { MAX_COMPARE, MIN_COMPARE } from '../lib/params'

import type { IScoutService } from '../service/scout.service.interface'

const compareQuery = z.object({
    ids: z
        .string()
        .transform((value) => value.split(','))
        .pipe(
            z
                .array(z.string().min(1).max(100))
                .min(MIN_COMPARE)
                .max(MAX_COMPARE)
                .refine((ids) => new Set(ids).size === ids.length, 'Each player can be compared once'),
        ),
})

export class ScoutController {
    private readonly service: IScoutService

    constructor(service: IScoutService) {
        this.service = service
    }

    list = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return this.service.getList()
    })

    profile = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return this.service.getProfile((await ctx.params).id)
    })

    compare = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return this.service.compare(parseQuery(req, compareQuery).ids)
    })
}

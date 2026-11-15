import { z } from 'zod'

import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { parseJson, withController } from '@/shared/lib/http'

import type { IAutoBuildService } from '../service/autobuild.service.interface'
import type { ISquadReviewService } from '@/server/squad/service/squad-review.service'

const buildSchema = z.object({
    lockedIds: z.array(z.string().min(1).max(100)).max(15).default([]),
    excludedIds: z.array(z.string().min(1).max(100)).max(200).default([]),
    refresh: z.boolean().optional(),
})

const reviewSchema = z.object({ refresh: z.boolean().optional() })

export class AutoBuildController {
    private readonly autoBuild: IAutoBuildService
    private readonly reviews: ISquadReviewService

    constructor(autoBuild: IAutoBuildService, reviews: ISquadReviewService) {
        this.autoBuild = autoBuild
        this.reviews = reviews
    }

    build = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return this.autoBuild.build(userId, await parseJson(req, buildSchema))
    })

    review = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { refresh } = await parseJson(req, reviewSchema)

        return this.reviews.review(userId, (await ctx.params).id, { refresh })
    })
}

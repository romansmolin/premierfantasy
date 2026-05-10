import { z } from 'zod'

import { Errors, withController } from '@/shared/lib/http'

import type { IPricingService } from '../service/pricing.service.interface'

const seasonParamSchema = z.object({
    seasonYear: z.coerce.number().int().min(2000).max(2100),
})

export class PricingController {
    private readonly pricingService: IPricingService

    constructor(pricingService: IPricingService) {
        this.pricingService = pricingService
    }

    getBySeason = withController(async (_req, ctx) => {
        const { seasonYear } = seasonParamSchema.parse(await ctx.params)

        return this.pricingService.getPricesForSeason(seasonYear)
    })

    uploadCsv = withController(async (req, ctx) => {
        const adminSecret = process.env.ADMIN_SECRET

        if (!adminSecret) {
            throw Errors.internal('ADMIN_SECRET is not configured')
        }

        const authHeader = req.headers.get('authorization')

        if (authHeader !== `Bearer ${adminSecret}`) {
            throw Errors.unauthorized()
        }

        const { seasonYear } = seasonParamSchema.parse(await ctx.params)
        const csv = await req.text()

        return this.pricingService.upsertFromCsv(seasonYear, csv)
    })
}

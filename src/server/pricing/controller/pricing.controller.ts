import { z } from 'zod'

import { assertAdmin } from '@/shared/lib/admin-auth'
import { withController } from '@/shared/lib/http'

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
        assertAdmin(req)

        const { seasonYear } = seasonParamSchema.parse(await ctx.params)
        const csv = await req.text()

        return this.pricingService.upsertFromCsv(seasonYear, csv)
    })
}

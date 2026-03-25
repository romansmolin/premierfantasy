import { z } from 'zod'

export const createGameweekSchema = z.object({
    number: z.number().int().positive(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
})

export const syncGameweeksSchema = z.object({
    season: z.number().int(),
    leagueId: z.number().int(),
})

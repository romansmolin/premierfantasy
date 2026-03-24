import { z } from 'zod'

export const createCompetitionSchema = z
    .object({
        name: z.string().min(1, 'Name is required'),
        startGameweek: z.number().int().min(1),
        endGameweek: z.number().int().min(1),
    })
    .refine((data) => data.endGameweek > data.startGameweek, {
        message: 'endGameweek must be greater than startGameweek',
        path: ['endGameweek'],
    })

import { z } from 'zod'

export const saveSquadSchema = z.object({
    players: z
        .array(
            z.object({
                id: z.number(),
                name: z.string().min(1),
                position: z.enum(['GK', 'DEF', 'MID', 'FWD']),
                price: z.number().positive(),
                teamId: z.number(),
            }),
        )
        .length(11),
})

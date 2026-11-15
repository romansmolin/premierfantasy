import { z } from 'zod'

import { SEASON } from '@/shared/config/league'
import { assertAdmin } from '@/shared/lib/admin-auth'
import { parseJson, withController } from '@/shared/lib/http'

import type { IFplMappingService } from '../service/fpl-mapping.service.interface'

const bodySchema = z.union([
    z.object({ fplId: z.number().int().positive(), playerId: z.string().min(1) }),
    z.object({ fplId: z.number().int().positive(), reject: z.literal(true) }),
])

export class FplMappingController {
    private readonly service: IFplMappingService

    constructor(service: IFplMappingService) {
        this.service = service
    }

    list = withController(async (req) => {
        assertAdmin(req)

        return this.service.listUnmapped(SEASON)
    })

    update = withController(async (req) => {
        assertAdmin(req)

        const body = await parseJson(req, bodySchema)

        if ('reject' in body) await this.service.reject(body.fplId)
        else await this.service.confirm(body.fplId, body.playerId)

        return { ok: true }
    })
}

import { z } from 'zod'

import { SEASON } from '@/shared/config/league'
import { assertAdmin } from '@/shared/lib/admin-auth'
import { parseJson, withController } from '@/shared/lib/http'

import type { IFplMappingService } from '../service/fpl-mapping.service.interface'

const fplId = z.number().int().positive()

// Most specific first: a plain object schema would also accept (and strip) the extra keys of the others.
const bodySchema = z.union([
    z.object({ fplId, playerId: z.string().min(1), replace: z.literal(true) }),
    z.object({ fplId, unmap: z.literal(true) }),
    z.object({ fplId, reject: z.literal(true) }),
    z.object({ fplId, playerId: z.string().min(1) }),
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

        if ('replace' in body) await this.service.replace(body.fplId, body.playerId)
        else if ('unmap' in body) await this.service.unmap(body.fplId)
        else if ('reject' in body) await this.service.reject(body.fplId)
        else await this.service.confirm(body.fplId, body.playerId)

        return { ok: true }
    })
}

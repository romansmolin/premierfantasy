import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { withController } from '@/shared/lib/http'

import type { IBuilderService } from '../service/builder.service'

export class BuilderController {
    private readonly service: IBuilderService

    constructor(service: IBuilderService) {
        this.service = service
    }

    pool = withController(async (req) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        return this.service.getPool()
    })
}

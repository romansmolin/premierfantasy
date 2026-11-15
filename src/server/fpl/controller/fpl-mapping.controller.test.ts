import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FplMappingController } from './fpl-mapping.controller'

import type { IFplMappingService } from '../service/fpl-mapping.service.interface'

const ctx = { params: Promise.resolve({}) }

const request = (init: { auth?: string; body?: unknown; method?: string } = {}) =>
    new NextRequest('http://localhost/api/admin/fpl/mapping', {
        method: init.method ?? 'GET',
        headers: init.auth ? { authorization: init.auth } : {},
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })

const makeController = () => {
    const service = {
        listUnmapped: vi.fn().mockResolvedValue({ unmapped: [], counts: {} }),
        confirm: vi.fn().mockResolvedValue(undefined),
        reject: vi.fn().mockResolvedValue(undefined),
    } as unknown as IFplMappingService

    return { controller: new FplMappingController(service), service }
}

describe('FplMappingController admin auth', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('returns 500 when ADMIN_SECRET is not set', async () => {
        vi.stubEnv('ADMIN_SECRET', '')

        const response = await makeController().controller.list(request({ auth: 'Bearer x' }), ctx)

        expect(response.status).toBe(500)
    })

    it('returns 401 without the bearer token', async () => {
        vi.stubEnv('ADMIN_SECRET', 'top-secret')

        const { controller, service } = makeController()
        const response = await controller.list(request(), ctx)

        expect(response.status).toBe(401)
        expect(service.listUnmapped).not.toHaveBeenCalled()
    })

    it('returns 401 for a wrong token', async () => {
        vi.stubEnv('ADMIN_SECRET', 'top-secret')

        const response = await makeController().controller.list(request({ auth: 'Bearer nope' }), ctx)

        expect(response.status).toBe(401)
    })

    it('lists with the right token', async () => {
        vi.stubEnv('ADMIN_SECRET', 'top-secret')

        const { controller, service } = makeController()
        const response = await controller.list(request({ auth: 'Bearer top-secret' }), ctx)

        expect(response.status).toBe(200)
        expect(service.listUnmapped).toHaveBeenCalled()
    })

    it('rejects an invalid body with 400', async () => {
        vi.stubEnv('ADMIN_SECRET', 'top-secret')

        const response = await makeController().controller.update(
            request({ auth: 'Bearer top-secret', method: 'POST', body: { fplId: 'x' } }),
            ctx,
        )

        expect(response.status).toBe(400)
    })

    it('confirms a mapping and rejects a player through the same endpoint', async () => {
        vi.stubEnv('ADMIN_SECRET', 'top-secret')

        const { controller, service } = makeController()

        await controller.update(
            request({ auth: 'Bearer top-secret', method: 'POST', body: { fplId: 1, playerId: 'p1' } }),
            ctx,
        )
        await controller.update(
            request({ auth: 'Bearer top-secret', method: 'POST', body: { fplId: 2, reject: true } }),
            ctx,
        )

        expect(service.confirm).toHaveBeenCalledWith(1, 'p1')
        expect(service.reject).toHaveBeenCalledWith(2)
    })
})

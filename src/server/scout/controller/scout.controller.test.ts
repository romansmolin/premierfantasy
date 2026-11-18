import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ScoutController } from './scout.controller'

import type { IScoutService } from '../service/scout.service.interface'

const auth = vi.hoisted(() => ({ userId: vi.fn() }))

vi.mock('@/shared/lib/auth-helpers', () => ({
    requireUserId: auth.userId,
    isAuthError: (value: unknown) => value instanceof NextResponse,
}))

const empty = { position: 'MID' as const, players: [] }

const make = () => {
    const service = {
        getList: vi.fn().mockResolvedValue({ items: [] }),
        getProfile: vi.fn().mockResolvedValue({}),
        compare: vi.fn().mockResolvedValue(empty),
    } satisfies IScoutService

    return { service, controller: new ScoutController(service) }
}

const get = (path: string) => new NextRequest(`http://localhost${path}`)
const ctx = { params: Promise.resolve({ id: 'p1' }) }

beforeEach(() => {
    auth.userId.mockResolvedValue('user-1')
})

describe('ScoutController', () => {
    it('answers 401 on every route without a session and never calls the service', async () => {
        auth.userId.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

        const { service, controller } = make()

        expect((await controller.list(get('/api/scout/players'), ctx)).status).toBe(401)
        expect((await controller.profile(get('/api/scout/players/p1'), ctx)).status).toBe(401)
        expect((await controller.compare(get('/api/scout/compare?ids=a,b'), ctx)).status).toBe(401)
        expect(service.getList).not.toHaveBeenCalled()
        expect(service.getProfile).not.toHaveBeenCalled()
        expect(service.compare).not.toHaveBeenCalled()
    })

    it('loads a profile by the id in the path', async () => {
        const { service, controller } = make()

        expect((await controller.profile(get('/api/scout/players/p1'), ctx)).status).toBe(200)
        expect(service.getProfile).toHaveBeenCalledWith('p1')
    })

    it.each(['', '?ids=a', '?ids=a,b,c,d', '?ids=a,a', '?ids=a,,b'])(
        'rejects the compare query "%s" with 400',
        async (query) => {
            const { service, controller } = make()

            expect((await controller.compare(get(`/api/scout/compare${query}`), ctx)).status).toBe(400)
            expect(service.compare).not.toHaveBeenCalled()
        },
    )

    it('passes two ids to the service in the given order', async () => {
        const { service, controller } = make()

        expect((await controller.compare(get('/api/scout/compare?ids=a,b'), ctx)).status).toBe(200)
        expect(service.compare).toHaveBeenCalledTimes(1)
        expect(service.compare).toHaveBeenCalledWith(['a', 'b'])
    })
})

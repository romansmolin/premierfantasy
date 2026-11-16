import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SyncCronController } from './sync-cron.controller'

import type { JobFn } from '../jobs'
import type { ISyncRunRepository } from '../repository/sync-run.repository.interface'

const revalidateTag = vi.hoisted(() => vi.fn())

vi.mock('next/cache', () => ({ revalidateTag }))

const ctx = { params: Promise.resolve({}) }

const request = (auth?: string) =>
    new NextRequest('http://localhost/api/cron/sync', { headers: auth ? { authorization: auth } : {} })

const makeController = (jobs: Record<string, JobFn>) => {
    const repo = {
        start: vi.fn().mockResolvedValue('run'),
        finish: vi.fn().mockResolvedValue(undefined),
    } satisfies ISyncRunRepository
    const buildJobs = vi.fn().mockReturnValue(jobs)

    return { controller: new SyncCronController(repo, buildJobs), buildJobs }
}

const ok: JobFn = async () => ({ status: 'OK', stats: {} })

const allOk = {
    'fpl-bootstrap': ok,
    fixtures: ok,
    'match-stats': ok,
    'fpl-fixtures': ok,
    'fpl-points': ok,
    'fpl-matches': ok,
    forecast: ok,
    probability: ok,
}

describe('SyncCronController', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('returns 500 when CRON_SECRET is not set', async () => {
        vi.stubEnv('CRON_SECRET', '')

        expect((await makeController(allOk).controller.run(request('Bearer x'), ctx)).status).toBe(500)
    })

    it('returns 401 without or with a wrong bearer token and runs nothing', async () => {
        vi.stubEnv('CRON_SECRET', 'cron-secret')

        const { controller, buildJobs } = makeController(allOk)

        expect((await controller.run(request(), ctx)).status).toBe(401)
        expect((await controller.run(request('Bearer nope'), ctx)).status).toBe(401)
        expect(buildJobs).not.toHaveBeenCalled()
    })

    it('runs the full job list in order and returns 200', async () => {
        vi.stubEnv('CRON_SECRET', 'cron-secret')

        const order: string[] = []
        const track =
            (name: string): JobFn =>
            async () => (order.push(name), { status: 'OK', stats: {} })
        const { controller } = makeController({
            'fpl-bootstrap': track('fpl-bootstrap'),
            fixtures: track('fixtures'),
            'match-stats': track('match-stats'),
            'fpl-fixtures': track('fpl-fixtures'),
            'fpl-points': track('fpl-points'),
            'fpl-matches': track('fpl-matches'),
            forecast: track('forecast'),
            probability: track('probability'),
        })

        const response = await controller.run(request('Bearer cron-secret'), ctx)

        expect(response.status).toBe(200)
        expect(order).toEqual([
            'fpl-bootstrap',
            'fixtures',
            'match-stats',
            'fpl-fixtures',
            'fpl-points',
            'fpl-matches',
            'forecast',
            'probability',
        ])
        expect(Object.keys(await response.json())).toEqual(order)
    })

    it('runs the remaining jobs and returns 500 when one fails', async () => {
        vi.stubEnv('CRON_SECRET', 'cron-secret')

        const { controller } = makeController({
            ...allOk,
            fixtures: async () => {
                throw new Error('boom')
            },
        })

        const response = await controller.run(request('Bearer cron-secret'), ctx)
        const body = await response.json()

        expect(response.status).toBe(500)
        expect(body.fixtures.status).toBe('FAILED')
        expect(body['fpl-points'].status).toBe('OK')
    })

    it('purges the cached public stats after a run', async () => {
        vi.stubEnv('CRON_SECRET', 'secret')
        revalidateTag.mockClear()

        await makeController(allOk).controller.run(request('Bearer secret'), ctx)

        expect(revalidateTag).toHaveBeenCalledWith('stats', { expire: 0 })
    })
})

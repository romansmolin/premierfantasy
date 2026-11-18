import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FULL_JOBS, SHORT_JOBS } from '../jobs'

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
        const { controller } = makeController(
            Object.fromEntries(Object.keys(allOk).map((name) => [name, track(name)])),
        )

        const response = await controller.run(request('Bearer cron-secret'), ctx)

        expect(response.status).toBe(200)
        expect(order).toEqual([
            'fpl-bootstrap',
            'fixtures',
            'match-stats',
            'fpl-fixtures',
            'fpl-points',
            'forecast',
            'fpl-matches',
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

    it('keeps the slow probability job out of the 60 s sync cron and runs fpl-matches after forecast', () => {
        expect(FULL_JOBS).not.toContain('probability')
        expect(SHORT_JOBS).not.toContain('probability')
        expect(FULL_JOBS.indexOf('fpl-matches')).toBeGreaterThan(FULL_JOBS.indexOf('forecast'))
    })
})

describe('SyncCronController.runProbability', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    const tracked = () => {
        const order: string[] = []
        const jobs = Object.fromEntries(
            Object.keys(allOk).map((name): [string, JobFn] => [
                name,
                async () => (order.push(name), { status: 'OK', stats: {} }),
            ]),
        )

        return { order, ...makeController(jobs) }
    }

    it('runs only the probability job, purges the stats cache and returns 200', async () => {
        vi.stubEnv('CRON_SECRET', 'cron-secret')
        revalidateTag.mockClear()

        const { controller, order } = tracked()
        const response = await controller.runProbability(request('Bearer cron-secret'), ctx)

        expect(response.status).toBe(200)
        expect(order).toEqual(['probability'])
        expect(Object.keys(await response.json())).toEqual(['probability'])
        expect(revalidateTag).toHaveBeenCalledWith('stats', { expire: 0 })
    })

    it('needs the same cron secret and runs nothing without it', async () => {
        vi.stubEnv('CRON_SECRET', 'cron-secret')

        const { controller, buildJobs, order } = tracked()

        expect((await controller.runProbability(request(), ctx)).status).toBe(401)
        expect((await controller.runProbability(request('Bearer nope'), ctx)).status).toBe(401)
        expect(buildJobs).not.toHaveBeenCalled()
        expect(order).toEqual([])

        vi.stubEnv('CRON_SECRET', '')
        expect((await controller.runProbability(request('Bearer x'), ctx)).status).toBe(500)
    })

    it('returns 500 when the probability job fails', async () => {
        vi.stubEnv('CRON_SECRET', 'cron-secret')

        const { controller } = makeController({
            ...allOk,
            probability: async () => {
                throw new Error('boom')
            },
        })
        const response = await controller.runProbability(request('Bearer cron-secret'), ctx)

        expect(response.status).toBe(500)
        expect((await response.json()).probability.status).toBe('FAILED')
    })
})

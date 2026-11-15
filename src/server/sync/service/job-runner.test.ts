import { describe, expect, it, vi } from 'vitest'

import { SuspiciousResponseError } from '../lib/errors'
import { RequestBudget } from '../lib/request-budget'

import { runJob } from './job-runner'

import type { ISyncRunRepository } from '../repository/sync-run.repository.interface'

const makeRepo = () => {
    const repo = {
        start: vi.fn().mockResolvedValue('run-1'),
        finish: vi.fn().mockResolvedValue(undefined),
    } satisfies ISyncRunRepository

    return repo
}

describe('runJob', () => {
    it('records OK with stats', async () => {
        const repo = makeRepo()

        const result = await runJob('fixtures', repo, async () => ({ status: 'OK', stats: { inserted: 3 } }))

        expect(result).toEqual({ status: 'OK', stats: { inserted: 3 } })
        expect(repo.start).toHaveBeenCalledWith('fixtures')
        expect(repo.finish).toHaveBeenCalledWith('run-1', 'OK', { inserted: 3 }, undefined)
    })

    it('records PARTIAL and keeps the stats', async () => {
        const repo = makeRepo()

        const result = await runJob('match-stats', repo, async () => ({
            status: 'PARTIAL',
            stats: { saved: 10 },
        }))

        expect(result.status).toBe('PARTIAL')
        expect(repo.finish).toHaveBeenCalledWith('run-1', 'PARTIAL', { saved: 10 }, undefined)
    })

    it('records FAILED and returns the error instead of throwing', async () => {
        const repo = makeRepo()

        const result = await runJob('fpl-points', repo, async () => {
            throw new Error('boom')
        })

        expect(result).toEqual({ status: 'FAILED', stats: {}, error: 'boom' })
        expect(repo.finish).toHaveBeenCalledWith('run-1', 'FAILED', {}, 'boom')
    })

    it('a SuspiciousResponseError is recorded as FAILED with its message', async () => {
        const repo = makeRepo()

        const result = await runJob('fixtures', repo, async () => {
            throw new SuspiciousResponseError('empty fixtures list')
        })

        expect(result.status).toBe('FAILED')
        expect(result.error).toBe('empty fixtures list')
    })

    it('still returns FAILED when recording the finish fails', async () => {
        const repo = makeRepo()

        repo.finish.mockRejectedValue(new Error('db down'))

        const result = await runJob('fixtures', repo, async () => ({ status: 'OK', stats: {} }))

        expect(result.status).toBe('OK')
    })
})

describe('RequestBudget', () => {
    it('stops at max requests', () => {
        const budget = new RequestBudget(2)

        expect([budget.take(null), budget.take(null), budget.take(null)]).toEqual([true, true, false])
        expect(budget.used).toBe(2)
    })

    it('stops when dailyRemaining falls to the reserve', () => {
        const budget = new RequestBudget(100, 1500)

        expect(budget.take(1501)).toBe(true)
        expect(budget.take(1500)).toBe(false)
    })

    it('ignores a null dailyRemaining', () => {
        const budget = new RequestBudget(100, 1500)

        expect(budget.take(null)).toBe(true)
    })
})

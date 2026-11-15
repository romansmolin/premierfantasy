import { describe, expect, it, vi } from 'vitest'

import { BilledRunner } from './billed-runner'

import type { IAiReportRepository } from '../repository/ai-report.repository.interface'
import type { IWalletService } from '@/server/wallet/service/wallet.service.interface'

const make = (opts: { cached?: unknown[]; balance?: number } = {}) => {
    const findLatest = vi.fn()

    for (const c of opts.cached ?? [null]) findLatest.mockResolvedValueOnce(c)

    findLatest.mockResolvedValue(opts.cached ? opts.cached[opts.cached.length - 1] : null)

    const reports = { findLatest, save: vi.fn().mockResolvedValue(undefined) } satisfies IAiReportRepository
    const wallet = {
        getBalance: vi.fn().mockResolvedValue(opts.balance ?? 1000),
        spendOnFeature: vi.fn().mockResolvedValue(undefined),
        getWallet: vi.fn(),
    } satisfies IWalletService

    return { runner: new BilledRunner(reports, wallet), reports, wallet }
}

describe('BilledRunner.run', () => {
    it('charges the feature price once after generating and stores the result', async () => {
        const { runner, reports, wallet } = make()

        const out = await runner.run('u1', 'AUTO_BUILD', 'k', {}, async () => ({ a: 1 }))

        expect(out).toEqual({ result: { a: 1 }, cached: false })
        expect(wallet.spendOnFeature).toHaveBeenCalledWith('u1', 300, 'Auto-build')
        expect(reports.save).toHaveBeenCalledWith('u1', 'AUTO_BUILD', 'k', { a: 1 })
    })

    it('returns a cached result without charging or generating', async () => {
        const { runner, wallet } = make({ cached: [{ a: 9 }] })
        const generate = vi.fn()

        const out = await runner.run('u1', 'SQUAD_REVIEW', 'k', {}, generate)

        expect(out).toEqual({ result: { a: 9 }, cached: true })
        expect(generate).not.toHaveBeenCalled()
        expect(wallet.spendOnFeature).not.toHaveBeenCalled()
    })

    it('refresh skips the cache and charges again', async () => {
        const { runner, wallet } = make({ cached: [{ a: 9 }] })

        const out = await runner.run('u1', 'SQUAD_REVIEW', 'k', { refresh: true }, async () => ({ a: 2 }))

        expect(out.cached).toBe(false)
        expect(wallet.spendOnFeature).toHaveBeenCalledWith('u1', 30, 'Squad review')
    })

    it('throws 402 before generating when the balance is too low', async () => {
        const { runner } = make({ balance: 29 })
        const generate = vi.fn()

        await expect(runner.run('u1', 'SQUAD_REVIEW', 'k', {}, generate)).rejects.toMatchObject({
            statusCode: 402,
        })
        expect(generate).not.toHaveBeenCalled()
    })

    it('does not charge or store when generation fails', async () => {
        const { runner, wallet, reports } = make()

        await expect(
            runner.run('u1', 'AUTO_BUILD', 'k', {}, async () => {
                throw new Error('infeasible')
            }),
        ).rejects.toThrow('infeasible')
        expect(wallet.spendOnFeature).not.toHaveBeenCalled()
        expect(reports.save).not.toHaveBeenCalled()
    })

    it('returns the report a concurrent request saved meanwhile without charging again', async () => {
        const { runner, wallet } = make({ cached: [null, { a: 'other tab' }] })

        const out = await runner.run('u1', 'AUTO_BUILD', 'k', {}, async () => ({ a: 'mine' }))

        expect(out).toEqual({ result: { a: 'other tab' }, cached: true })
        expect(wallet.spendOnFeature).not.toHaveBeenCalled()
    })

    it('still returns the paid result when saving fails', async () => {
        const { runner, reports, wallet } = make()

        reports.save.mockRejectedValue(new Error('db'))

        const out = await runner.run('u1', 'AUTO_BUILD', 'k', {}, async () => ({ a: 1 }))

        expect(out.result).toEqual({ a: 1 })
        expect(wallet.spendOnFeature).toHaveBeenCalledTimes(1)
    })
})

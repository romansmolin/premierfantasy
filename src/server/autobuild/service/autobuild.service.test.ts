import { describe, expect, it, vi } from 'vitest'

import { BilledRunner } from '@/server/ai/service/billed-runner'

import { DEFAULT_SQUAD_RULES, validateSquad } from '@/entities/squad/model/rules'
import type { BuilderPool, PoolPlayer } from '@/entities/squad/model/squad.types'

import { AutoBuildService } from './autobuild.service'

import type { IAutoBuildExplainer } from './autobuild.service.interface'
import type { IAiReportRepository } from '@/server/ai/repository/ai-report.repository.interface'
import type { IBuilderService } from '@/server/squad/service/builder.service'
import type { IWalletService } from '@/server/wallet/service/wallet.service.interface'

function pool(overrides: Partial<BuilderPool> = {}, priceTenths: number | null = 55): BuilderPool {
    const players: PoolPlayer[] = []
    const spec: [PoolPlayer['position'], number][] = [
        ['GK', 12],
        ['DEF', 35],
        ['MID', 40],
        ['FWD', 20],
    ]
    let n = 0

    for (const [position, count] of spec) {
        for (let i = 0; i < count; i += 1) {
            n += 1
            players.push({
                id: `p${n}`,
                name: `Player ${n}`,
                photoUrl: '',
                clubId: `c${n % 10}`,
                clubName: `Club ${n % 10}`,
                clubLogo: null,
                position,
                priceTenths: priceTenths === null ? null : priceTenths + (n % 7) * 5,
                minutes: 900,
                form: 3,
                forecast: 2 + (n % 11) * 0.5,
                availability: null,
            })
        }
    }

    return { rules: DEFAULT_SQUAD_RULES, forecastEnabled: true, nextEvent: 11, players, ...overrides }
}

const make = (
    opts: { pool?: BuilderPool; balance?: number; stamp?: Date; explainer?: IAutoBuildExplainer } = {},
) => {
    const saved = new Map<string, unknown>()
    const reports = {
        findLatest: vi
            .fn()
            .mockImplementation(async (_u: string, _kind: string, key: string) => saved.get(key) ?? null),
        save: vi.fn().mockImplementation(async (_u: string, _kind: string, key: string, payload: unknown) => {
            saved.set(key, payload)
        }),
    } satisfies IAiReportRepository
    const wallet = {
        getBalance: vi.fn().mockResolvedValue(opts.balance ?? 1000),
        spendOnFeature: vi.fn().mockResolvedValue(undefined),
        getWallet: vi.fn(),
    } satisfies IWalletService
    const status = {
        enabled: true,
        nextEvent: 11,
        evaluation: { createdAt: opts.stamp ?? new Date('2026-11-16T06:00:00Z') },
    }
    const forecast = {
        run: vi.fn(),
        getStatus: vi
            .fn()
            .mockImplementation(async () =>
                opts.pool?.forecastEnabled === false ? { ...status, enabled: false } : status,
            ),
    }
    const builder = { getPool: vi.fn().mockResolvedValue(opts.pool ?? pool()) } satisfies IBuilderService
    const explainer = opts.explainer ?? { explain: vi.fn().mockResolvedValue('Because numbers.') }
    const service = new AutoBuildService(
        builder,
        forecast as never,
        new BilledRunner(reports, wallet),
        explainer,
    )

    return { service, wallet, reports, explainer, forecast }
}

const request = (extra = {}) => ({ lockedIds: [], excludedIds: [], ...extra })

describe('AutoBuildService.build', () => {
    it('returns a legal squad, charges 300 once and includes the explanation', async () => {
        const { service, wallet } = make()

        const result = await service.build('u1', request())
        const infos = new Map(
            pool().players.map((p) => [
                p.id,
                { playerId: p.id, position: p.position, clubId: p.clubId, priceTenths: p.priceTenths },
            ]),
        )

        expect(validateSquad(result, infos, DEFAULT_SQUAD_RULES).errors).toEqual([])
        expect(result.explanation).toBe('Because numbers.')
        expect(result.event).toBe(11)
        expect(wallet.spendOnFeature).toHaveBeenCalledTimes(1)
        expect(wallet.spendOnFeature).toHaveBeenCalledWith('u1', 300, 'Auto-build')
    })

    it('a repeat with the same constraints in the same gameweek is free', async () => {
        const { service, wallet } = make()

        await service.build('u1', request())
        await service.build('u1', request())

        expect(wallet.spendOnFeature).toHaveBeenCalledTimes(1)
    })

    it('different constraints are a new paid run, and refresh pays again', async () => {
        const { service, wallet } = make()

        await service.build('u1', request())
        await service.build('u1', request({ excludedIds: ['p1'] }))

        expect(wallet.spendOnFeature).toHaveBeenCalledTimes(2)

        await service.build('u1', request({ excludedIds: ['p1'] }))

        expect(wallet.spendOnFeature).toHaveBeenCalledTimes(2)

        await service.build('u1', request({ excludedIds: ['p1'], refresh: true }))

        expect(wallet.spendOnFeature).toHaveBeenCalledTimes(3)
    })

    it('duplicate ids in the constraints change nothing: same squad, same cache key', async () => {
        const { service, wallet } = make()

        await service.build('u1', request({ lockedIds: ['p1', 'p1'], excludedIds: ['p2', 'p2'] }))
        await service.build('u1', request({ lockedIds: ['p1'], excludedIds: ['p2'] }))

        expect(wallet.spendOnFeature).toHaveBeenCalledTimes(1)
    })

    it('honours locked and excluded players', async () => {
        const { service } = make()
        const result = await service.build(
            'u1',
            request({ lockedIds: ['p40'], excludedIds: ['p1', 'p2', 'p3'] }),
        )
        const chosen = [...result.starters, ...result.bench]

        expect(chosen).toContain('p40')
        expect(chosen.some((id) => ['p1', 'p2', 'p3'].includes(id))).toBe(false)
    })

    it('refuses when the forecast is off, without charging', async () => {
        const { service, wallet } = make({ pool: pool({ forecastEnabled: false }) })

        await expect(service.build('u1', request())).rejects.toMatchObject({ statusCode: 422 })
        expect(wallet.spendOnFeature).not.toHaveBeenCalled()
    })

    it('refuses without current prices, without charging', async () => {
        const { service, wallet } = make({ pool: pool({}, null) })

        await expect(service.build('u1', request())).rejects.toMatchObject({ statusCode: 422 })
        expect(wallet.spendOnFeature).not.toHaveBeenCalled()
    })

    it('refuses impossible constraints with 422 and does not charge', async () => {
        const { service, wallet } = make()
        const keepers = pool()
            .players.filter((p) => p.position === 'GK')
            .slice(0, 3)
            .map((p) => p.id)

        await expect(service.build('u1', request({ lockedIds: keepers }))).rejects.toMatchObject({
            statusCode: 422,
        })
        expect(wallet.spendOnFeature).not.toHaveBeenCalled()
    })

    it('refuses unknown player ids', async () => {
        const { service } = make()

        await expect(service.build('u1', request({ lockedIds: ['ghost'] }))).rejects.toMatchObject({
            statusCode: 422,
        })
    })

    it('throws 402 when the balance is too low and does not run the optimizer', async () => {
        const { service, explainer } = make({ balance: 100 })

        await expect(service.build('u1', request())).rejects.toMatchObject({ statusCode: 402 })
        expect(explainer.explain).not.toHaveBeenCalled()
    })

    it('still delivers the squad when the explanation fails', async () => {
        const { service } = make({
            explainer: { explain: vi.fn().mockRejectedValue(new Error('openai down')) },
        })

        const result = await service.build('u1', request())

        expect(result.explanation).toBeNull()
        expect(result.starters).toHaveLength(11)
    })

    it('flags a cached result as outdated when the forecast was recalculated since', async () => {
        const first = make({ stamp: new Date('2026-11-16T06:00:00Z') })
        const built = await first.service.build('u1', request())

        expect(built.forecastUpdated).toBe(false)

        first.forecast.getStatus.mockResolvedValue({
            enabled: true,
            nextEvent: 11,
            evaluation: { createdAt: new Date('2026-11-17T06:00:00Z') },
        })

        const again = await first.service.build('u1', request())

        expect(again.forecastUpdated).toBe(true)
        expect(first.wallet.spendOnFeature).toHaveBeenCalledTimes(1)
    })
})

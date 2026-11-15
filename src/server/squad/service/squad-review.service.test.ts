import { describe, expect, it, vi } from 'vitest'

import { BilledRunner } from '@/server/ai/service/billed-runner'

import { DEFAULT_SQUAD_RULES } from '@/entities/squad/model/rules'
import type { BuilderPool, PoolPlayer, SavedSquad } from '@/entities/squad/model/squad.types'

import { Errors } from '@/shared/lib/http'

import { SquadReviewService } from './squad-review.service'

import type { ISquadReviewGenerator } from './squad-review.service'
import type { IAiReportRepository } from '@/server/ai/repository/ai-report.repository.interface'
import type { IWalletService } from '@/server/wallet/service/wallet.service.interface'

function pool(): BuilderPool {
    const players: PoolPlayer[] = []
    const spec: [PoolPlayer['position'], number][] = [
        ['GK', 4],
        ['DEF', 8],
        ['MID', 8],
        ['FWD', 6],
    ]
    let n = 0

    for (const [position, count] of spec) {
        for (let i = 0; i < count; i += 1) {
            n += 1
            players.push({
                id: `p${n}`,
                name: `Player ${n}`,
                clubId: `c${n % 10}`,
                clubName: `Club ${n % 10}`,
                position,
                priceTenths: 55,
                minutes: 900,
                form: 3,
                forecast: 3,
                availability: n === 3 ? { status: 'd', chanceOfPlaying: 50, news: 'Knock' } : null,
            })
        }
    }

    return { rules: DEFAULT_SQUAD_RULES, forecastEnabled: true, nextEvent: 11, players }
}

const squad = (over: Partial<SavedSquad> = {}): SavedSquad => ({
    id: 's1',
    name: 'Mine',
    starters: ['p1', 'p5', 'p6', 'p7', 'p8', 'p13', 'p14', 'p15', 'p16', 'p21', 'p22'],
    bench: ['p2', 'p9', 'p10', 'p17'],
    captainId: 'p21',
    viceCaptainId: 'p22',
    updatedAt: '2026-11-16T00:00:00.000Z',
    validation: { valid: true, errors: [], totalTenths: 825, bankTenths: 175 } as never,
    priceDriftTenths: null,
    ...over,
})

const draft = {
    summary: 'Solid squad.',
    strengths: ['Premium forwards'],
    risks: ['Thin bench'],
    suggestions: [{ out: 'p9', in: 'p11', reason: 'Better fixtures' }],
}

const make = (
    opts: {
        balance?: number
        stamp?: Date
        enabled?: boolean
        generator?: ISquadReviewGenerator
        current?: SavedSquad
        store?: Map<string, unknown>
    } = {},
) => {
    const saved = opts.store ?? new Map<string, unknown>()
    const reports = {
        findLatest: vi
            .fn()
            .mockImplementation(async (_u: string, _kind: string, key: string) => saved.get(key) ?? null),
        save: vi.fn().mockImplementation(async (_u: string, _kind: string, key: string, payload: unknown) => {
            saved.set(key, payload)
        }),
    } satisfies IAiReportRepository
    const wallet = {
        getBalance: vi.fn().mockResolvedValue(opts.balance ?? 100),
        spendOnFeature: vi.fn().mockResolvedValue(undefined),
        getWallet: vi.fn(),
    } satisfies IWalletService
    const status = {
        enabled: opts.enabled ?? true,
        nextEvent: 11,
        evaluation: { createdAt: opts.stamp ?? new Date('2026-11-16T06:00:00Z') },
    }
    const forecast = { run: vi.fn(), getStatus: vi.fn().mockImplementation(async () => status) }
    const builder = { getPool: vi.fn().mockResolvedValue(pool()) }
    const squads = {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        get: vi.fn().mockImplementation(async (_u: string, id: string) => {
            if (id !== 's1') throw Errors.notFound('Squad not found')

            return opts.current ?? squad()
        }),
    }
    const generator = opts.generator ?? { review: vi.fn().mockResolvedValue(draft) }
    const service = new SquadReviewService(
        squads,
        builder,
        forecast as never,
        new BilledRunner(reports, wallet),
        generator,
    )

    return { service, wallet, generator, squads }
}

describe('SquadReviewService.review', () => {
    it('returns the review, charges 30 once', async () => {
        const { service, wallet } = make()

        const result = await service.review('u1', 's1')

        expect(result.summary).toBe('Solid squad.')
        expect(result.event).toBe(11)
        expect(result.forecastUpdated).toBe(false)
        expect(wallet.spendOnFeature).toHaveBeenCalledWith('u1', 30, 'Squad review')
        expect(wallet.spendOnFeature).toHaveBeenCalledTimes(1)
    })

    it('a repeat for the same squad in the same gameweek is free; refresh pays again', async () => {
        const { service, wallet } = make()

        await service.review('u1', 's1')
        await service.review('u1', 's1')

        expect(wallet.spendOnFeature).toHaveBeenCalledTimes(1)

        await service.review('u1', 's1', { refresh: true })

        expect(wallet.spendOnFeature).toHaveBeenCalledTimes(2)
    })

    it('a changed squad is a new paid review', async () => {
        const store = new Map<string, unknown>()

        await make({ store }).service.review('u1', 's1')

        const changed = make({ store, current: squad({ bench: ['p2', 'p9', 'p10', 'p18'] }) })

        await changed.service.review('u1', 's1')
        await changed.service.review('u1', 's1')

        expect(changed.wallet.spendOnFeature).toHaveBeenCalledTimes(1)
    })

    it('moving a player between the XI and the bench is a new paid review', async () => {
        const store = new Map<string, unknown>()

        await make({ store }).service.review('u1', 's1')

        const swapped = squad({
            starters: ['p1', 'p5', 'p6', 'p7', 'p8', 'p13', 'p14', 'p15', 'p10', 'p21', 'p22'],
            bench: ['p2', 'p9', 'p16', 'p17'],
        })
        const again = make({ store, current: swapped })

        await again.service.review('u1', 's1')

        expect(again.wallet.spendOnFeature).toHaveBeenCalledTimes(1)
    })

    it('drops suggestions that point at players outside the pool or the wrong side of the squad', async () => {
        const generator = {
            review: vi.fn().mockResolvedValue({
                ...draft,
                suggestions: [
                    { out: 'p9', in: 'p11', reason: 'ok' },
                    { out: 'p9', in: 'nobody', reason: 'invented' },
                    { out: 'p11', in: 'p12', reason: 'out is not in the squad' },
                    { out: 'p9', in: 'p10', reason: 'in is already in the squad' },
                    { out: 'p9', in: 'p25', reason: 'a forward cannot replace a defender' },
                ],
            }),
        }
        const { service } = make({ generator })

        const result = await service.review('u1', 's1')

        expect(result.suggestions).toEqual([{ out: 'p9', in: 'p11', reason: 'ok' }])
    })

    it('404 for an unknown squad, nothing charged or generated', async () => {
        const { service, wallet, generator } = make()

        await expect(service.review('u1', 'missing')).rejects.toMatchObject({ statusCode: 404 })

        expect(wallet.spendOnFeature).not.toHaveBeenCalled()
        expect(generator.review).not.toHaveBeenCalled()
    })

    it('422 while the forecast is off', async () => {
        const { service, wallet } = make({ enabled: false })

        await expect(service.review('u1', 's1')).rejects.toMatchObject({ statusCode: 422 })

        expect(wallet.spendOnFeature).not.toHaveBeenCalled()
    })

    it('402 on a low balance without calling the generator', async () => {
        const { service, generator } = make({ balance: 5 })

        await expect(service.review('u1', 's1')).rejects.toMatchObject({ statusCode: 402 })

        expect(generator.review).not.toHaveBeenCalled()
    })

    it('a generator failure costs nothing', async () => {
        const generator = { review: vi.fn().mockRejectedValue(new Error('openai down')) }
        const { service, wallet } = make({ generator })

        await expect(service.review('u1', 's1')).rejects.toThrow('openai down')

        expect(wallet.spendOnFeature).not.toHaveBeenCalled()
    })

    it('flags a cached review as outdated when the forecast was recalculated since', async () => {
        const store = new Map<string, unknown>()

        await make({ store }).service.review('u1', 's1')

        const later = make({ store, stamp: new Date('2026-11-17T06:00:00Z') })
        const result = await later.service.review('u1', 's1')

        expect(result.forecastUpdated).toBe(true)
        expect(later.wallet.spendOnFeature).not.toHaveBeenCalled()
    })
})

import { describe, expect, it, vi } from 'vitest'

import type { MatchPrediction, PlayerAnalysis } from '@/entities/ai/model/ai.types'

import { AIInsightsService } from './ai-insights.service'

import type { IAiReportRepository } from '../repository/ai-report.repository.interface'
import type { IAIGenerator } from './ai-generator.service.interface'
import type { IWalletService } from '@/server/wallet/service/wallet.service.interface'

const NOW = new Date('2026-11-15T12:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000

const playerResult = { summary: 'player' } as unknown as PlayerAnalysis
const matchResult = { summary: 'match' } as unknown as MatchPrediction

function setup(overrides: { cached?: unknown; balance?: number } = {}) {
    const generator = {
        analyzePlayer: vi.fn().mockResolvedValue(playerResult),
        predictMatch: vi.fn().mockResolvedValue(matchResult),
    } satisfies IAIGenerator
    const reports = {
        findLatest: vi.fn().mockResolvedValue(overrides.cached ?? null),
        save: vi.fn().mockResolvedValue(undefined),
    } satisfies IAiReportRepository
    const wallet = {
        getBalance: vi.fn().mockResolvedValue(overrides.balance ?? 100),
        spendOnFeature: vi.fn().mockResolvedValue(undefined),
        getWallet: vi.fn(),
    } satisfies IWalletService
    const service = new AIInsightsService(generator, reports, wallet, () => NOW)

    return { service, generator, reports, wallet }
}

describe('AIInsightsService.getPlayerAnalysis', () => {
    it('returns cached player analysis without charging', async () => {
        const { service, generator, wallet } = setup({ cached: playerResult })

        const result = await service.getPlayerAnalysis('u1', 7)

        expect(result).toBe(playerResult)
        expect(generator.analyzePlayer).not.toHaveBeenCalled()
        expect(wallet.spendOnFeature).not.toHaveBeenCalled()
    })

    it('charges 10 credits and caches on a miss', async () => {
        const { service, reports, wallet } = setup()

        const result = await service.getPlayerAnalysis('u1', 7)

        expect(result).toBe(playerResult)
        expect(wallet.spendOnFeature).toHaveBeenCalledTimes(1)
        expect(wallet.spendOnFeature).toHaveBeenCalledWith('u1', 10, 'Player analysis')
        expect(reports.save).toHaveBeenCalledTimes(1)
        expect(reports.save).toHaveBeenCalledWith('u1', 'PLAYER_ANALYSIS', 'player:7', playerResult)
    })

    it('looks up the player cache 7 days back', async () => {
        const { service, reports } = setup()

        await service.getPlayerAnalysis('u1', 7)

        expect(reports.findLatest).toHaveBeenCalledWith(
            'u1',
            'PLAYER_ANALYSIS',
            'player:7',
            new Date(NOW.getTime() - 7 * DAY_MS),
        )
    })

    it('throws 402 before generating when the balance is too low', async () => {
        const { service, generator } = setup({ balance: 9 })

        await expect(service.getPlayerAnalysis('u1', 7)).rejects.toMatchObject({ statusCode: 402 })
        expect(generator.analyzePlayer).not.toHaveBeenCalled()
    })

    it('does not charge or cache when generation fails', async () => {
        const { service, generator, reports, wallet } = setup()

        generator.analyzePlayer.mockRejectedValue(new Error('openai down'))

        await expect(service.getPlayerAnalysis('u1', 7)).rejects.toThrow('openai down')
        expect(wallet.spendOnFeature).not.toHaveBeenCalled()
        expect(reports.save).not.toHaveBeenCalled()
    })

    it('does not cache when the charge fails', async () => {
        const { service, reports, wallet } = setup()

        wallet.spendOnFeature.mockRejectedValue(
            Object.assign(new Error('Not enough credits'), { statusCode: 402 }),
        )

        await expect(service.getPlayerAnalysis('u1', 7)).rejects.toMatchObject({ statusCode: 402 })
        expect(reports.save).not.toHaveBeenCalled()
    })
})

describe('AIInsightsService.getMatchPrediction', () => {
    it('match prediction cache has no window', async () => {
        const { service, reports } = setup()

        await service.getMatchPrediction('u1', 99)

        expect(reports.findLatest).toHaveBeenCalledWith('u1', 'MATCH_PREDICTION', 'fixture:99', null)
    })

    it('charges 10 credits and caches on a miss', async () => {
        const { service, reports, wallet } = setup()

        await service.getMatchPrediction('u1', 99)

        expect(wallet.spendOnFeature).toHaveBeenCalledWith('u1', 10, 'Match prediction')
        expect(reports.save).toHaveBeenCalledWith('u1', 'MATCH_PREDICTION', 'fixture:99', matchResult)
    })
})

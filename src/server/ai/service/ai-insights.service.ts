import { AI_FEATURE_LABELS, AI_FEATURE_PRICES } from '@/entities/ai/model/ai-pricing'
import type { AiFeature } from '@/entities/ai/model/ai-pricing'
import type { MatchPrediction, PlayerAnalysis } from '@/entities/ai/model/ai.types'

import { Errors } from '@/shared/lib/http'

import type { IAIGenerator } from './ai-generator.service.interface'
import type { IAIInsightsService } from './ai-insights.service.interface'
import type { IAiReportRepository } from '../repository/ai-report.repository.interface'
import type { IWalletService } from '@/server/wallet/service/wallet.service.interface'

const DAY_MS = 24 * 60 * 60 * 1000
const PLAYER_CACHE_MS = 7 * DAY_MS

export class AIInsightsService implements IAIInsightsService {
    private readonly generator: IAIGenerator
    private readonly reports: IAiReportRepository
    private readonly wallet: IWalletService
    private readonly now: () => Date

    constructor(
        generator: IAIGenerator,
        reports: IAiReportRepository,
        wallet: IWalletService,
        now: () => Date = () => new Date(),
    ) {
        this.generator = generator
        this.reports = reports
        this.wallet = wallet
        this.now = now
    }

    getPlayerAnalysis(userId: string, playerExternalId: number): Promise<PlayerAnalysis> {
        return this.billed(
            userId,
            'PLAYER_ANALYSIS',
            `player:${playerExternalId}`,
            new Date(this.now().getTime() - PLAYER_CACHE_MS),
            () => this.generator.analyzePlayer(playerExternalId),
        )
    }

    getMatchPrediction(userId: string, fixtureId: number): Promise<MatchPrediction> {
        return this.billed(userId, 'MATCH_PREDICTION', `fixture:${fixtureId}`, null, () =>
            this.generator.predictMatch(fixtureId),
        )
    }

    /** Cache hit is free. A miss is charged only after generation succeeded, and cached only after the charge did. */
    private async billed<T>(
        userId: string,
        kind: AiFeature,
        subjectKey: string,
        notBefore: Date | null,
        generate: () => Promise<T>,
    ): Promise<T> {
        const cached = await this.reports.findLatest(userId, kind, subjectKey, notBefore)

        if (cached) return cached as T

        const price = AI_FEATURE_PRICES[kind]

        if ((await this.wallet.getBalance(userId)) < price) throw Errors.paymentRequired()

        const result = await generate()

        await this.wallet.spendOnFeature(userId, price, AI_FEATURE_LABELS[kind])
        await this.reports.save(userId, kind, subjectKey, result)

        return result
    }
}

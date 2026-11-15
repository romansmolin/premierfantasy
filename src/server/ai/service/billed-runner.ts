import { AI_FEATURE_LABELS, AI_FEATURE_PRICES } from '@/entities/ai/model/ai-pricing'

import { Errors } from '@/shared/lib/http'

import type { AiFeature } from '@/entities/ai/model/ai-pricing'
import type { IAiReportRepository } from '../repository/ai-report.repository.interface'
import type { IWalletService } from '@/server/wallet/service/wallet.service.interface'

/**
 * The paid-feature pattern (docs/server-architecture.md): cached result is free; otherwise check the balance,
 * generate, re-check the cache for a concurrent request, charge atomically, then store. A failure before the
 * charge never costs anything; a failed save never withholds a paid result.
 */
export class BilledRunner {
    private readonly reports: IAiReportRepository
    private readonly wallet: IWalletService
    /** Runs in progress in this process: a double click or a retry joins the running request instead of paying twice. */
    private readonly inFlight = new Map<string, Promise<{ result: unknown; cached: boolean }>>()

    constructor(reports: IAiReportRepository, wallet: IWalletService) {
        this.reports = reports
        this.wallet = wallet
    }

    async run<T>(
        userId: string,
        kind: AiFeature,
        subjectKey: string,
        opts: { refresh?: boolean },
        generate: () => Promise<T>,
    ): Promise<{ result: T; cached: boolean }> {
        const id = JSON.stringify([userId, kind, subjectKey])
        const running = this.inFlight.get(id)

        if (running) return (await running) as { result: T; cached: boolean }

        const started = this.execute(userId, kind, subjectKey, opts, generate)

        this.inFlight.set(id, started)

        try {
            return await started
        } finally {
            this.inFlight.delete(id)
        }
    }

    private async execute<T>(
        userId: string,
        kind: AiFeature,
        subjectKey: string,
        opts: { refresh?: boolean },
        generate: () => Promise<T>,
    ): Promise<{ result: T; cached: boolean }> {
        if (!opts.refresh) {
            const cached = await this.reports.findLatest(userId, kind, subjectKey, null)

            if (cached) return { result: cached as T, cached: true }
        }

        const price = AI_FEATURE_PRICES[kind]

        if ((await this.wallet.getBalance(userId)) < price) throw Errors.paymentRequired()

        const result = await generate()

        if (!opts.refresh) {
            const concurrent = await this.reports.findLatest(userId, kind, subjectKey, null)

            if (concurrent) return { result: concurrent as T, cached: true }
        }

        await this.wallet.spendOnFeature(userId, price, AI_FEATURE_LABELS[kind])

        try {
            await this.reports.save(userId, kind, subjectKey, result)
        } catch (error) {
            console.error('Failed to save AI report', error)
        }

        return { result, cached: false }
    }
}

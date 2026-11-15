import { createHash } from 'node:crypto'

import type { AutoBuildRequest, AutoBuildResult } from '@/entities/squad/model/autobuild.types'
import { validateSquad } from '@/entities/squad/model/rules'
import type { SquadRules } from '@/entities/squad/model/rules'
import type { PoolPlayer } from '@/entities/squad/model/squad.types'

import { Errors } from '@/shared/lib/http'

import { InfeasibleError, optimizeSquad } from '../lib/optimizer'

import type { IAutoBuildExplainer, IAutoBuildService } from './autobuild.service.interface'
import type { BilledRunner } from '@/server/ai/service/billed-runner'
import type { IForecastService } from '@/server/prediction/service/forecast.service.interface'
import type { IBuilderService } from '@/server/squad/service/builder.service'

/** Auto-build needs prices for most of the pool; a half-priced pool would silently shrink the choice. */
const MIN_PRICED_SHARE = 0.5

type Stored = Omit<AutoBuildResult, 'forecastUpdated'> & { forecastStamp: string }

export class AutoBuildService implements IAutoBuildService {
    private readonly builder: IBuilderService
    private readonly forecast: IForecastService
    private readonly billed: BilledRunner
    private readonly explainer: IAutoBuildExplainer

    constructor(
        builder: IBuilderService,
        forecast: IForecastService,
        billed: BilledRunner,
        explainer: IAutoBuildExplainer,
    ) {
        this.builder = builder
        this.forecast = forecast
        this.billed = billed
        this.explainer = explainer
    }

    async build(userId: string, request: AutoBuildRequest): Promise<AutoBuildResult> {
        const status = await this.forecast.getStatus()

        if (!status.enabled || status.nextEvent === null) {
            throw Errors.unprocessable('Auto-build is switched off until the forecast beats the baseline')
        }

        const event = status.nextEvent
        const stamp = status.evaluation?.createdAt.toISOString() ?? ''
        const pool = await this.builder.getPool()
        const priced = pool.players.filter((p) => p.priceTenths !== null)

        if (priced.length < pool.rules.squadSize || priced.length < pool.players.length * MIN_PRICED_SHARE) {
            throw Errors.unprocessable(
                'Auto-build needs current FPL prices, which are not available right now',
            )
        }

        const known = new Map(pool.players.map((p) => [p.id, p]))
        const unknown = [...request.lockedIds, ...request.excludedIds].filter((id) => !known.has(id))

        if (unknown.length > 0) throw Errors.unprocessable('Some chosen players are not available')

        const key = this.key(event, request)
        const { result } = await this.billed.run<Stored>(
            userId,
            'AUTO_BUILD',
            key,
            { refresh: request.refresh },
            () => this.generate(event, stamp, request, known, priced, pool.rules),
        )
        const { forecastStamp, ...rest } = result

        return { ...rest, forecastUpdated: forecastStamp !== stamp }
    }

    private key(event: number, request: AutoBuildRequest): string {
        const hash = createHash('sha1')
            .update(JSON.stringify({ l: [...request.lockedIds].sort(), e: [...request.excludedIds].sort() }))
            .digest('hex')
            .slice(0, 16)

        return `autobuild:${event}:${hash}`
    }

    private async generate(
        event: number,
        stamp: string,
        request: AutoBuildRequest,
        known: Map<string, PoolPlayer>,
        priced: PoolPlayer[],
        rules: SquadRules,
    ): Promise<Stored> {
        let optimized

        try {
            optimized = optimizeSquad({
                candidates: priced.map((p) => ({
                    id: p.id,
                    position: p.position,
                    clubId: p.clubId,
                    priceTenths: p.priceTenths as number,
                    points: Math.max(0, p.forecast ?? 0),
                })),
                rules,
                locked: request.lockedIds,
                excluded: request.excludedIds,
            })
        } catch (error) {
            if (error instanceof InfeasibleError) throw Errors.unprocessable(error.message)

            throw error
        }

        const draft = {
            starters: optimized.starters,
            bench: optimized.bench,
            captainId: optimized.captainId,
            viceCaptainId: optimized.viceCaptainId,
        }
        const infos = new Map(
            priced.map((p) => [
                p.id,
                { playerId: p.id, position: p.position, clubId: p.clubId, priceTenths: p.priceTenths },
            ]),
        )
        const check = validateSquad(draft, infos, rules)

        // A rule-breaking squad must never reach (or be charged to) a user.
        if (!check.valid) throw Errors.internal('Auto-build produced an invalid squad')

        const name = (id: string) => known.get(id)?.name ?? id
        let explanation: string | null = null

        try {
            explanation = await this.explainer.explain({
                event,
                totalTenths: optimized.totalTenths,
                expectedXi: optimized.expectedXi,
                captain: name(optimized.captainId),
                players: [
                    ...optimized.starters.map((id) => [id, true] as const),
                    ...optimized.bench.map((id) => [id, false] as const),
                ].map(([id, starter]) => {
                    const p = known.get(id) as PoolPlayer

                    return {
                        name: p.name,
                        club: p.clubName,
                        position: p.position,
                        priceTenths: p.priceTenths as number,
                        forecast: p.forecast ?? 0,
                        form: p.form,
                        starter,
                        note:
                            p.availability && p.availability.status !== 'a'
                                ? p.availability.news || p.availability.status
                                : null,
                    }
                }),
                locked: request.lockedIds.map(name),
                excluded: request.excludedIds.map(name),
            })
        } catch (error) {
            // The squad is the product; a missing explanation does not make it worthless.
            console.error('Auto-build explanation failed', error instanceof Error ? error.message : error)
        }

        return {
            event,
            ...draft,
            totalTenths: optimized.totalTenths,
            expectedXi: Math.round(optimized.expectedXi * 100) / 100,
            explanation,
            generatedAt: new Date().toISOString(),
            forecastStamp: stamp,
        }
    }
}

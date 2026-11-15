import { createHash } from 'node:crypto'

import type { SquadReview } from '@/entities/squad/model/autobuild.types'
import type { PoolPlayer, SavedSquad } from '@/entities/squad/model/squad.types'

import { Errors } from '@/shared/lib/http'

import type { IBuilderService } from './builder.service'
import type { ISquadService } from './squad.service.interface'
import type { BilledRunner } from '@/server/ai/service/billed-runner'
import type { IForecastService } from '@/server/prediction/service/forecast.service.interface'

export interface ReviewPlayer {
    id: string
    name: string
    club: string
    position: string
    priceTenths: number | null
    forecast: number | null
    form: number | null
    role: 'starter' | 'bench'
    captain: 'captain' | 'vice' | null
    note: string | null
}

export interface ReviewContext {
    event: number
    squadName: string
    players: ReviewPlayer[]
    /** Best-forecast alternatives per position that are not in the squad; the only players the generator may suggest. */
    alternatives: Omit<ReviewPlayer, 'role' | 'captain'>[]
}

export type ReviewDraft = Pick<SquadReview, 'summary' | 'strengths' | 'risks' | 'suggestions'>

export interface ISquadReviewGenerator {
    review(context: ReviewContext): Promise<ReviewDraft>
}

export interface ISquadReviewService {
    /** 30 Credits; cached per squad composition and gameweek. 422 while the forecast is off. */
    review(userId: string, squadId: string, opts?: { refresh?: boolean }): Promise<SquadReview>
}

const ALTERNATIVES_PER_POSITION = 8

type Stored = Omit<SquadReview, 'forecastUpdated'> & { forecastStamp: string }

export class SquadReviewService implements ISquadReviewService {
    private readonly squads: ISquadService
    private readonly builder: IBuilderService
    private readonly forecast: IForecastService
    private readonly billed: BilledRunner
    private readonly generator: ISquadReviewGenerator

    constructor(
        squads: ISquadService,
        builder: IBuilderService,
        forecast: IForecastService,
        billed: BilledRunner,
        generator: ISquadReviewGenerator,
    ) {
        this.squads = squads
        this.builder = builder
        this.forecast = forecast
        this.billed = billed
        this.generator = generator
    }

    async review(userId: string, squadId: string, opts: { refresh?: boolean } = {}): Promise<SquadReview> {
        const squad = await this.squads.get(userId, squadId)
        const status = await this.forecast.getStatus()

        if (!status.enabled || status.nextEvent === null) {
            throw Errors.unprocessable('Squad review is switched off until the forecast beats the baseline')
        }

        const event = status.nextEvent
        const stamp = status.evaluation?.createdAt.toISOString() ?? ''
        const key = this.key(event, squad)
        const { result } = await this.billed.run<Stored>(
            userId,
            'SQUAD_REVIEW',
            key,
            { refresh: opts.refresh },
            async () => {
                const pool = await this.builder.getPool()
                const known = new Map(pool.players.map((p) => [p.id, p]))
                const context = this.context(event, squad, known, pool.players)
                const draft = await this.generator.review(context)
                const mine = new Map(context.players.map((p) => [p.id, p]))
                const alternatives = new Map(context.alternatives.map((p) => [p.id, p]))

                return {
                    summary: draft.summary,
                    strengths: draft.strengths,
                    risks: draft.risks,
                    // The generator is language-model output: only suggestions about real players on the right side count.
                    suggestions: draft.suggestions.filter((s) => {
                        const out = mine.get(s.out)
                        const incoming = alternatives.get(s.in)

                        return (
                            out !== undefined && incoming !== undefined && out.position === incoming.position
                        )
                    }),
                    event,
                    generatedAt: new Date().toISOString(),
                    forecastStamp: stamp,
                }
            },
        )
        const { forecastStamp, ...rest } = result

        return { ...rest, forecastUpdated: forecastStamp !== stamp }
    }

    private key(event: number, squad: SavedSquad): string {
        const hash = createHash('sha1')
            .update(
                JSON.stringify({
                    starters: [...squad.starters].sort(),
                    bench: [...squad.bench].sort(),
                    captain: squad.captainId,
                    vice: squad.viceCaptainId,
                }),
            )
            .digest('hex')
            .slice(0, 16)

        return `review:${event}:${squad.id}:${hash}`
    }

    private context(
        event: number,
        squad: {
            name: string
            starters: string[]
            bench: string[]
            captainId: string
            viceCaptainId: string
        },
        known: Map<string, PoolPlayer>,
        all: PoolPlayer[],
    ): ReviewContext {
        const describe = (p: PoolPlayer) => ({
            id: p.id,
            name: p.name,
            club: p.clubName,
            position: p.position as string,
            priceTenths: p.priceTenths,
            forecast: p.forecast,
            form: p.form,
            note:
                p.availability && p.availability.status !== 'a'
                    ? p.availability.news || p.availability.status
                    : null,
        })
        const mine = (ids: string[], role: ReviewPlayer['role']): ReviewPlayer[] =>
            ids.flatMap((id) => {
                const p = known.get(id)

                if (!p) return []

                return [
                    {
                        ...describe(p),
                        role,
                        captain:
                            id === squad.captainId
                                ? ('captain' as const)
                                : id === squad.viceCaptainId
                                  ? ('vice' as const)
                                  : null,
                    },
                ]
            })
        const players = [...mine(squad.starters, 'starter'), ...mine(squad.bench, 'bench')]
        const owned = new Set(players.map((p) => p.id))
        const alternatives = (['GK', 'DEF', 'MID', 'FWD'] as const).flatMap((position) =>
            all
                .filter((p) => p.position === position && !owned.has(p.id) && p.forecast !== null)
                .sort((a, b) => (b.forecast ?? 0) - (a.forecast ?? 0) || a.id.localeCompare(b.id))
                .slice(0, ALTERNATIVES_PER_POSITION)
                .map(describe),
        )

        return { event, squadName: squad.name, players, alternatives }
    }
}

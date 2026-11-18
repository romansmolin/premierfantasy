import { isGateOn } from '@/server/prediction/lib/v2/evaluation'
import { MIN_APPEARANCES } from '@/server/prediction/lib/v2/params'

import { fixtureHorizons, gated, gateHorizon } from '../lib/gating'
import { formOf, linePoints, seasonTotals } from '../lib/player-form'
import { buildProbabilityCard, isUpcoming } from '../lib/probability-card'

import type {
    FixtureWithChances,
    FormMatch,
    HeatmapClub,
    IStatsService,
    PlayerListItem,
    PlayerListQuery,
    PlayerListResult,
    PlayerProfile,
    PlayerSort,
} from './stats.service.interface'
import type { ExplainFacts } from '../lib/explain'
import type { IStatsRepository, StatsLineRow, StatsPlayer } from '../repository/stats.repository.interface'
import type { ForecastStatus, IForecastService } from '@/server/prediction/service/forecast.service.interface'
import type { IProbabilityService } from '@/server/prediction/service/probability.service.interface'

const PAGE_SIZE = 50
const RECENT_MATCHES = 8
const FORM_MATCHES = 10
const HEATMAP_EVENTS = 8
/** FPL statuses that rule a player out (doubtful players keep their chances). */
const OUT_STATUSES = new Set(['i', 's', 'u', 'n'])

const fold = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0)

const explainFactsOf = (
    player: StatsPlayer,
    form: FormMatch[],
    penaltyOrder: number | null,
): ExplainFacts => {
    const a = player.availability
    const xgs = form.map((m) => m.xg)

    return {
        startsOfLast:
            form.length > 0 ? { started: form.filter((m) => m.started).length, of: form.length } : null,
        penaltyOrder,
        goalsLast10: form.length > 0 ? sum(form.map((m) => m.goals)) : null,
        xgLast10: form.length > 0 && xgs.every((x) => x !== null) ? sum(xgs as number[]) : null,
        expectedTeamGoals: null,
        leagueGoals: null,
        unavailable: a && a.news && (OUT_STATUSES.has(a.status) || a.chanceOfPlaying === 0) ? a.news : null,
    }
}

const groupLines = (lines: StatsLineRow[]): Map<string, StatsLineRow[]> => {
    const map = new Map<string, StatsLineRow[]>()

    for (const l of lines) map.set(l.playerId, [...(map.get(l.playerId) ?? []), l])

    return map
}

export class StatsService implements IStatsService {
    private readonly repo: IStatsRepository
    private readonly forecast: IForecastService
    private readonly probabilities: IProbabilityService

    constructor(repo: IStatsRepository, forecast: IForecastService, probabilities: IProbabilityService) {
        this.repo = repo
        this.forecast = forecast
        this.probabilities = probabilities
    }

    /** Next-match chances per player; empty without an evaluation. Stale rows (past fixtures) are dropped. */
    private async nextChances(
        players: StatsPlayer[],
    ): Promise<Map<string, NonNullable<PlayerListItem['next']>>> {
        const status = await this.probabilities.getStatus()
        const result = new Map<string, NonNullable<PlayerListItem['next']>>()

        if (status.evaluatedAt === null) return result

        const rows = await this.probabilities.getNextMatchForAll()
        const fixtures = new Map(
            (await this.repo.findFixturesByIds([...new Set([...rows.values()].map((r) => r.fixtureId))])).map(
                (f) => [f.id, f],
            ),
        )
        const now = new Date()

        for (const p of players) {
            const row = rows.get(p.id)

            if (!row || !isUpcoming(fixtures.get(row.fixtureId), now)) continue

            const on = (metric: 'goal' | 'assist' | 'start') =>
                isGateOn(status.gates, metric, 'next', p.position)

            result.set(p.id, {
                pGoal: gated(row.pGoal, on('goal')),
                pAssist: gated(row.pAssist, on('assist')),
                pStart: gated(row.pStart, on('start')),
            })
        }

        return result
    }

    private async buildItems(): Promise<{
        players: StatsPlayer[]
        items: PlayerListItem[]
        status: ForecastStatus
    }> {
        const [players, lines, status] = await Promise.all([
            this.repo.findPlayers(),
            this.repo.findLines(),
            this.forecast.getStatus(),
        ])
        const predictions =
            status.enabled && status.nextEvent !== null
                ? await this.repo.findPredictions(status.nextEvent)
                : []
        const predicted = new Map(predictions.map((p) => [p.playerId, p.expectedPoints]))
        const next = await this.nextChances(players)
        const byPlayer = groupLines(lines)
        const items: PlayerListItem[] = players.map((p) => {
            const mine = byPlayer.get(p.id) ?? []
            const totals = seasonTotals(mine)

            return {
                id: p.id,
                externalId: p.externalId,
                name: p.name,
                club: p.club,
                position: p.position,
                price: p.price,
                minutes: totals.minutes,
                goals: totals.goals,
                assists: totals.assists,
                form: formOf(p.position, mine),
                forecast: predicted.get(p.id) ?? null,
                availability: p.availability,
                next: next.get(p.id) ?? null,
            }
        })

        return { players, items, status }
    }

    async getAllPlayers() {
        const { items, status } = await this.buildItems()

        return { items, forecastEnabled: status.enabled, nextEvent: status.nextEvent }
    }

    async getPlayers(query: PlayerListQuery): Promise<PlayerListResult> {
        const { players, items, status } = await this.buildItems()
        const sort: PlayerSort =
            query.sort && !(query.sort === 'forecast' && !status.enabled)
                ? query.sort
                : status.enabled
                  ? 'forecast'
                  : 'form'
        const search = query.search ? fold(query.search.trim()) : ''
        const filtered = items
            .filter((i) => !query.position || i.position === query.position)
            .filter((i) => !query.clubId || i.club.id === query.clubId)
            .filter((i) => !search || fold(i.name).includes(search))
            .sort(this.comparator(sort))
        const page = Math.max(1, Math.floor(query.page ?? 1))

        return {
            items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
            total: filtered.length,
            page,
            pageSize: PAGE_SIZE,
            clubs: [...new Map(players.map((p) => [p.club.id, p.club])).values()].sort((a, b) =>
                a.name.localeCompare(b.name),
            ),
            sort,
            forecastEnabled: status.enabled,
            nextEvent: status.nextEvent,
        }
    }

    async getPlayer(id: string): Promise<PlayerProfile | null> {
        const players = await this.repo.findPlayers()
        const player = players.find((p) => p.id === id)

        if (!player) return null

        const [lines, status, fplRows, penaltyOrder, appearances] = await Promise.all([
            this.repo.findLines(id),
            this.forecast.getStatus(),
            this.repo.findFplMatches(id),
            this.repo.findPenaltyOrder(id),
            this.repo.countAppearances(id),
        ])
        const prediction =
            status.enabled && status.nextEvent !== null
                ? (await this.repo.findPredictions(status.nextEvent)).find((p) => p.playerId === id)
                : undefined

        const form = [...fplRows]
            .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())
            .slice(-FORM_MATCHES)
        const probabilities = await this.playerCard(
            player,
            form,
            penaltyOrder,
            appearances,
            status.enabled ? (prediction?.expectedPoints ?? null) : null,
            status.enabled ? status.nextEvent : null,
        )

        return {
            player,
            totals: seasonTotals(lines),
            form: formOf(player.position, lines),
            recent: [...lines]
                .sort((a, b) => b.kickoff.getTime() - a.kickoff.getTime())
                .slice(0, RECENT_MATCHES)
                .map((l) => ({
                    fixtureId: l.fixtureId,
                    kickoff: l.kickoff,
                    opponentName: l.opponentName,
                    isHome: l.isHome,
                    minutes: l.minutes,
                    goals: l.goals,
                    assists: l.assists,
                    points: linePoints(player.position, l),
                })),
            forecastEnabled: status.enabled,
            forecast:
                prediction && status.nextEvent !== null
                    ? {
                          event: status.nextEvent,
                          expectedPoints: prediction.expectedPoints,
                          expectedMinutes: prediction.expectedMinutes,
                          components: prediction.components,
                      }
                    : null,
            facts: { form, penaltyOrder },
            probabilities,
        }
    }

    private async playerCard(
        player: StatsPlayer,
        form: FormMatch[],
        penaltyOrder: number | null,
        appearances: number,
        v1Points: number | null,
        v1Event: number | null,
    ) {
        const [status, rows] = await Promise.all([
            this.probabilities.getStatus(),
            this.probabilities.getPlayerMatches(player.id),
        ])

        if (status.evaluatedAt === null) return null

        const [fixtures, fixtureProbs] = await Promise.all([
            this.repo.findFixturesByIds(rows.map((r) => r.fixtureId)),
            this.probabilities.getFixtureProbabilities(rows.map((r) => r.fixtureId)),
        ])

        return buildProbabilityCard({
            position: player.position,
            clubId: player.club.id,
            rows,
            fixtures: new Map(fixtures.map((f) => [f.id, f])),
            fixtureProbs: new Map(fixtureProbs.map((f) => [f.fixtureId, f])),
            status,
            lowData: appearances < MIN_APPEARANCES,
            v1Points,
            v1Event,
            facts: explainFactsOf(player, form, penaltyOrder),
            now: new Date(),
        })
    }

    async getFixtures() {
        const [{ event, fixtures }, status, probStatus] = await Promise.all([
            this.repo.findNextEventFixtures(),
            this.forecast.getStatus(),
            this.probabilities.getStatus(),
        ])
        const probs = new Map(
            (await this.probabilities.getFixtureProbabilities(fixtures.map((f) => f.id))).map((p) => [
                p.fixtureId,
                p,
            ]),
        )
        const horizons = fixtureHorizons(
            fixtures.map((f) => ({ id: f.id, kickoff: f.kickoff, homeId: f.home.id, awayId: f.away.id })),
        )
        const withChances: FixtureWithChances[] = fixtures.map((f) => {
            const p = probs.get(f.id)

            if (!p || probStatus.evaluatedAt === null) return { ...f, probabilities: null }

            const on = isGateOn(probStatus.gates, 'outcome', gateHorizon(horizons.get(f.id) ?? 1))

            return {
                ...f,
                probabilities: {
                    pHome: gated(p.pHome, on),
                    pDraw: gated(p.pDraw, on),
                    pAway: gated(p.pAway, on),
                },
            }
        })

        return { event, fixtures: withChances, forecastEnabled: status.enabled }
    }

    async getHeatmap() {
        const status = await this.probabilities.getStatus()
        const upcoming =
            status.evaluatedAt === null ? [] : await this.repo.findUpcomingFixtures(HEATMAP_EVENTS)
        const probs = new Map(
            (await this.probabilities.getFixtureProbabilities(upcoming.map((f) => f.id))).map((p) => [
                p.fixtureId,
                p,
            ]),
        )
        const horizons = fixtureHorizons(
            upcoming.map((f) => ({ id: f.id, kickoff: f.kickoff, homeId: f.home.id, awayId: f.away.id })),
        )
        const now = new Date()
        // The in-progress gameweek also lists matches already played: they are neither shown nor hidden.
        const live = upcoming.filter((f) => isUpcoming(f, now))
        const shown = live.filter(
            (f) => probs.has(f.id) && isGateOn(status.gates, 'outcome', gateHorizon(horizons.get(f.id) ?? 1)),
        )
        const shownIds = new Set(shown.map((f) => f.id))
        const events = [...new Set(upcoming.map((f) => f.event))].sort((a, b) => a - b)
        const clubs = new Map(upcoming.flatMap((f) => [f.home, f.away]).map((c) => [c.id, c.name]))
        const result: HeatmapClub[] = [...clubs].map(([clubId, name]) => ({
            clubId,
            name,
            cells: events.map((event) => {
                const mine = (f: (typeof upcoming)[number]) =>
                    f.event === event && (f.home.id === clubId || f.away.id === clubId)

                return {
                    event,
                    hidden: live.some((f) => mine(f) && !shownIds.has(f.id)),
                    matches: shown.filter(mine).map((f) => {
                        const p = probs.get(f.id) as NonNullable<ReturnType<typeof probs.get>>
                        const isHome = f.home.id === clubId
                        const against = isHome ? p.xgAway : p.xgHome

                        return {
                            opponent: isHome ? f.away.name : f.home.name,
                            isHome,
                            xgFor: isHome ? p.xgHome : p.xgAway,
                            // Poisson: the opponent scores nothing.
                            pCleanSheet: Math.exp(-against),
                        }
                    }),
                }
            }),
        }))

        return { events, clubs: result.sort((a, b) => a.name.localeCompare(b.name)) }
    }

    getForecastStatus() {
        return this.forecast.getStatus()
    }

    getProbabilityStatus() {
        return this.probabilities.getStatus()
    }

    async listPlayerIds(): Promise<string[]> {
        return (await this.repo.findPlayers()).map((p) => p.id)
    }

    private comparator(sort: PlayerSort): (a: PlayerListItem, b: PlayerListItem) => number {
        const nullsLast = (a: number | null, b: number | null, desc: boolean) => {
            if (a === null && b === null) return 0

            if (a === null) return 1

            if (b === null) return -1

            return desc ? b - a : a - b
        }

        return (a, b) => {
            switch (sort) {
                case 'forecast':
                    return nullsLast(a.forecast, b.forecast, true) || nullsLast(a.form, b.form, true)
                case 'form':
                    return nullsLast(a.form, b.form, true)
                case 'pGoal':
                case 'pAssist':
                case 'pStart':
                    return (
                        nullsLast(a.next?.[sort] ?? null, b.next?.[sort] ?? null, true) ||
                        nullsLast(a.form, b.form, true)
                    )
                case 'price':
                    return nullsLast(a.price, b.price, true)
                case 'minutes':
                    return b.minutes - a.minutes
                case 'goals':
                    return b.goals - a.goals
                case 'assists':
                    return b.assists - a.assists
                default:
                    return a.name.localeCompare(b.name)
            }
        }
    }
}

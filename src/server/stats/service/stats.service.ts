import { formOf, linePoints, seasonTotals } from '../lib/player-form'

import type {
    IStatsService,
    PlayerListItem,
    PlayerListQuery,
    PlayerListResult,
    PlayerProfile,
    PlayerSort,
} from './stats.service.interface'
import type { IStatsRepository, StatsLineRow } from '../repository/stats.repository.interface'
import type { IForecastService } from '@/server/prediction/service/forecast.service.interface'

const PAGE_SIZE = 50
const RECENT_MATCHES = 8

const fold = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const groupLines = (lines: StatsLineRow[]): Map<string, StatsLineRow[]> => {
    const map = new Map<string, StatsLineRow[]>()

    for (const l of lines) map.set(l.playerId, [...(map.get(l.playerId) ?? []), l])

    return map
}

export class StatsService implements IStatsService {
    private readonly repo: IStatsRepository
    private readonly forecast: IForecastService

    constructor(repo: IStatsRepository, forecast: IForecastService) {
        this.repo = repo
        this.forecast = forecast
    }

    async getPlayers(query: PlayerListQuery): Promise<PlayerListResult> {
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
        const byPlayer = groupLines(lines)
        const items: PlayerListItem[] = players.map((p) => {
            const mine = byPlayer.get(p.id) ?? []
            const totals = seasonTotals(mine)

            return {
                id: p.id,
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
            }
        })
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

        const [lines, status] = await Promise.all([this.repo.findLines(id), this.forecast.getStatus()])
        const prediction =
            status.enabled && status.nextEvent !== null
                ? (await this.repo.findPredictions(status.nextEvent)).find((p) => p.playerId === id)
                : undefined

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
        }
    }

    async getFixtures() {
        const [{ event, fixtures }, status] = await Promise.all([
            this.repo.findNextEventFixtures(),
            this.forecast.getStatus(),
        ])

        return { event, fixtures, forecastEnabled: status.enabled }
    }

    getForecastStatus() {
        return this.forecast.getStatus()
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

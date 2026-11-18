import { linePoints } from '@/server/stats/lib/player-form'

import { Errors } from '@/shared/lib/http'

import { MAX_COMPARE, MIN_COMPARE } from '../lib/params'
import { radarProfiles, seasonMetrics } from '../lib/radar'

import type {
    IScoutService,
    ScoutCompare,
    ScoutList,
    ScoutProfile,
    ScoutValue,
} from './scout.service.interface'
import type { RadarProfile, SeasonLine } from '../lib/radar'
import type { IStatsRepository, StatsLineRow } from '@/server/stats/repository/stats.repository.interface'
import type { IStatsService, PlayerListItem } from '@/server/stats/service/stats.service.interface'

interface Context {
    items: PlayerListItem[]
    forecastEnabled: boolean
    nextEvent: number | null
    radar: Map<string, RadarProfile>
    fpl: Map<string, { xg: number | null; xa: number | null }>
    value: Map<string, ScoutValue>
}

const groupBy = <T extends { playerId: string }>(rows: T[]): Map<string, T[]> => {
    const map = new Map<string, T[]>()

    for (const r of rows) map.set(r.playerId, [...(map.get(r.playerId) ?? []), r])

    return map
}

export class ScoutService implements IScoutService {
    private readonly stats: IStatsService
    private readonly repo: IStatsRepository

    constructor(stats: IStatsService, repo: IStatsRepository) {
        this.stats = stats
        this.repo = repo
    }

    /** Percentiles and ranks need every player, so each call builds the whole picture once. */
    private async context(): Promise<Context> {
        const [{ items, forecastEnabled, nextEvent }, lines, seasonLines, fpl] = await Promise.all([
            this.stats.getAllPlayers(),
            this.repo.findLines(),
            this.repo.findSeasonLines(),
            this.repo.findFplSeasonTotals(),
        ])
        const lineRows: Map<string, StatsLineRow[]> = groupBy(lines)
        const seasonRows: Map<string, SeasonLine[]> = groupBy(seasonLines)
        const radar = radarProfiles(
            items.map((p) => ({
                id: p.id,
                position: p.position,
                metrics: seasonMetrics(seasonRows.get(p.id) ?? [], fpl.get(p.id) ?? null),
            })),
        )
        const points = new Map(
            items.map((p) => [
                p.id,
                (lineRows.get(p.id) ?? []).reduce((total, l) => total + linePoints(p.position, l), 0),
            ]),
        )
        const perMillion = (p: PlayerListItem): number | null =>
            p.price !== null && p.price > 0 ? (points.get(p.id) ?? 0) / p.price : null
        const value = new Map<string, ScoutValue>()

        for (const p of items) {
            const mine = perMillion(p)
            const peers = items
                .filter((o) => o.position === p.position)
                .flatMap((o) => {
                    const v = perMillion(o)

                    return v === null ? [] : [v]
                })

            value.set(p.id, {
                points: points.get(p.id) ?? 0,
                pointsPerMillion: mine,
                rank: mine === null ? null : 1 + peers.filter((v) => v > mine).length,
                of: peers.length,
            })
        }

        return { items, forecastEnabled, nextEvent, radar, fpl, value }
    }

    private async profileOf(ctx: Context, id: string): Promise<ScoutProfile> {
        const item = ctx.items.find((p) => p.id === id)
        const profile = item ? await this.stats.getPlayer(id) : null
        const radar = ctx.radar.get(id)
        const value = ctx.value.get(id)

        if (!profile || !radar || !value) throw Errors.notFound('Player not found')

        return { profile, radar, value, season: ctx.fpl.get(id) ?? { xg: null, xa: null } }
    }

    async getList(): Promise<ScoutList> {
        const ctx = await this.context()
        const clubs = new Map(ctx.items.map((p) => [p.club.id, p.club]))

        return {
            items: ctx.items.map((p) => ({
                ...p,
                pointsPerMillion: ctx.value.get(p.id)?.pointsPerMillion ?? null,
            })),
            clubs: [...clubs.values()].sort((a, b) => a.name.localeCompare(b.name)),
            forecastEnabled: ctx.forecastEnabled,
            nextEvent: ctx.nextEvent,
        }
    }

    async getProfile(id: string): Promise<ScoutProfile> {
        return this.profileOf(await this.context(), id)
    }

    async compare(ids: string[]): Promise<ScoutCompare> {
        if (ids.length < MIN_COMPARE || ids.length > MAX_COMPARE) {
            throw Errors.badRequest(`Compare ${MIN_COMPARE} to ${MAX_COMPARE} players`)
        }

        if (new Set(ids).size !== ids.length) throw Errors.badRequest('Each player can be compared once')

        const ctx = await this.context()
        const players = await Promise.all(ids.map((id) => this.profileOf(ctx, id)))
        const position = players[0].profile.player.position

        if (players.some((p) => p.profile.player.position !== position)) {
            throw Errors.unprocessable('Compare players of one position: their stats are not comparable')
        }

        return { position, players }
    }
}

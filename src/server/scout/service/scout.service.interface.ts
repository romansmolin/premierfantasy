import type { RadarProfile } from '../lib/radar'
import type { Position } from '@/server/prediction/lib/scoring-rules'
import type { ClubRef } from '@/server/stats/repository/stats.repository.interface'
import type { PlayerListItem, PlayerProfile } from '@/server/stats/service/stats.service.interface'

export interface ScoutListItem extends PlayerListItem {
    /** Calculated season points (no bonus) per £m; null without a fresh price. */
    pointsPerMillion: number | null
}

export interface ScoutList {
    items: ScoutListItem[]
    clubs: ClubRef[]
    forecastEnabled: boolean
    nextEvent: number | null
}

export interface ScoutValue {
    points: number
    pointsPerMillion: number | null
    /** 1 = best points per £m among players of the same position; null without a price. */
    rank: number | null
    /** Players of the position that have a points-per-£m value. */
    of: number
}

export interface ScoutProfile {
    profile: PlayerProfile
    radar: RadarProfile
    value: ScoutValue
    /** Season xG and xA from FPL; null when FPL has no value. */
    season: { xg: number | null; xa: number | null }
}

export interface ScoutCompare {
    position: Position
    players: ScoutProfile[]
}

export interface IScoutService {
    getList(): Promise<ScoutList>
    getProfile(id: string): Promise<ScoutProfile>
    compare(ids: string[]): Promise<ScoutCompare>
}

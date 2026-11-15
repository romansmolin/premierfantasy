import type { seasonTotals } from '../lib/player-form'
import type { ClubRef, StatsFixture, StatsPlayer } from '../repository/stats.repository.interface'
import type { Position } from '@/server/prediction/lib/scoring-rules'
import type { ForecastStatus } from '@/server/prediction/service/forecast.service.interface'

export type PlayerSort = 'forecast' | 'form' | 'price' | 'minutes' | 'goals' | 'assists' | 'name'

export interface PlayerListQuery {
    position?: Position
    clubId?: string
    search?: string
    sort?: PlayerSort
    page?: number
}

export interface PlayerListItem {
    id: string
    name: string
    club: ClubRef
    position: Position
    price: number | null
    minutes: number
    goals: number
    assists: number
    form: number | null
    /** Null when the forecast is switched off or the player has no fixture next event. */
    forecast: number | null
    availability: StatsPlayer['availability']
}

export interface PlayerListResult {
    items: PlayerListItem[]
    total: number
    page: number
    pageSize: number
    clubs: ClubRef[]
    sort: PlayerSort
    forecastEnabled: boolean
    nextEvent: number | null
}

export interface PlayerProfile {
    player: StatsPlayer
    totals: ReturnType<typeof seasonTotals>
    form: number | null
    recent: {
        fixtureId: string
        kickoff: Date
        opponentName: string
        isHome: boolean
        minutes: number
        goals: number
        assists: number
        points: number
    }[]
    forecastEnabled: boolean
    forecast: {
        event: number
        expectedPoints: number
        expectedMinutes: number
        components: Record<string, number>
    } | null
}

export interface IStatsService {
    getPlayers(query: PlayerListQuery): Promise<PlayerListResult>
    getPlayer(id: string): Promise<PlayerProfile | null>
    getFixtures(): Promise<{ event: number | null; fixtures: StatsFixture[]; forecastEnabled: boolean }>
    getForecastStatus(): Promise<ForecastStatus>
    listPlayerIds(): Promise<string[]>
}

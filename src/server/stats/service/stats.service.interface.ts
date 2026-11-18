import type { seasonTotals } from '../lib/player-form'
import type { ClubRef, FormMatch, StatsFixture, StatsPlayer } from '../repository/stats.repository.interface'
import type { Position } from '@/server/prediction/lib/scoring-rules'
import type { ForecastStatus } from '@/server/prediction/service/forecast.service.interface'
import type { ProbabilityStatus } from '@/server/prediction/service/probability.service.interface'

export type { FormMatch }

export type PlayerSort =
    | 'forecast'
    | 'form'
    | 'price'
    | 'minutes'
    | 'goals'
    | 'assists'
    | 'name'
    | 'pGoal'
    | 'pAssist'
    | 'pStart'

export interface PlayerListQuery {
    position?: Position
    clubId?: string
    search?: string
    sort?: PlayerSort
    page?: number
}

export interface PlayerListItem {
    id: string
    /** API-Football player id. */
    externalId: number
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
    /** Next-match chances; a metric is null when it is gated off, the whole object when no forecast exists. */
    next: { pGoal: number | null; pAssist: number | null; pStart: number | null } | null
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

export interface PlayerProbabilityCard {
    modelVersion: string
    updatedAt: Date
    /** Too few appearances: every number is null. */
    lowData: boolean
    matches: {
        fixtureId: string
        kickoff: Date
        opponentName: string
        isHome: boolean
        /** 1..5: the player's n-th next match. */
        horizon: number
        pGoal: number | null
        pAssist: number | null
        pStart: number | null
        expectedMinutes: number | null
        expectedPoints: number | null
        /** Shares of 0–2, 3–5, 6–9, 10+ points. */
        pointsBuckets: number[] | null
        pWin: number | null
        pDraw: number | null
        pLose: number | null
    }[]
    explanation: string[]
    /** Why a number is hidden, in plain words. */
    offReasons: string[]
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
    /** Stored facts behind the forecasts; `form` is the last 10 FPL lines in kickoff order. */
    facts: { form: FormMatch[]; penaltyOrder: number | null }
    /** Null when no evaluation or no stored probabilities exist (facts-only profile). */
    probabilities: PlayerProbabilityCard | null
}

export type FixtureWithChances = StatsFixture & {
    /** Null when no outcome probability is stored; the numbers are null when the outcome gate is off. */
    probabilities: { pHome: number | null; pDraw: number | null; pAway: number | null } | null
}

export interface HeatmapClub {
    clubId: string
    name: string
    cells: {
        event: number
        /** Only the matches whose forecast is shown (outcome gate on and a stored row). */
        matches: { opponent: string; isHome: boolean; xgFor: number; pCleanSheet: number }[]
        /** True when the club has a fixture in this event that was left out of `matches` (gate off or no row); false with empty `matches` is a real blank gameweek. */
        hidden: boolean
    }[]
}

export interface IStatsService {
    getPlayers(query: PlayerListQuery): Promise<PlayerListResult>
    getPlayer(id: string): Promise<PlayerProfile | null>
    /** Every listed player with form and forecast, unpaged (the builder pool). */
    getAllPlayers(): Promise<{ items: PlayerListItem[]; forecastEnabled: boolean; nextEvent: number | null }>
    getFixtures(): Promise<{ event: number | null; fixtures: FixtureWithChances[]; forecastEnabled: boolean }>
    /** Expected goals and clean-sheet chance per club for the next 8 events; matches with the outcome gate off are left out of `matches` and flagged by `hidden`. */
    getHeatmap(): Promise<{ events: number[]; clubs: HeatmapClub[] }>
    getForecastStatus(): Promise<ForecastStatus>
    getProbabilityStatus(): Promise<ProbabilityStatus>
    listPlayerIds(): Promise<string[]>
}

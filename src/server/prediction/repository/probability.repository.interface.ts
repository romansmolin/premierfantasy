import type { ProbabilityEvaluation } from '../lib/v2/evaluation'

export interface PlayerMatchProbability {
    fixtureId: string
    playerId: string
    /** 1..5: the player's n-th next match. */
    horizon: number
    pGoal: number
    pAssist: number
    pStart: number
    expectedMinutes: number
    /** Calibrated expected FPL points. */
    expectedPoints: number
    /** Four shares: 0–2, 3–5, 6–9, 10+ points. */
    pointsBuckets: number[]
}

export interface FixtureProbabilityRow {
    fixtureId: string
    pHome: number
    pDraw: number
    pAway: number
    xgHome: number
    xgAway: number
    leagueGoals: number
}

export interface IProbabilityRepository {
    saveEvaluation(e: ProbabilityEvaluation): Promise<void>
    findLatestEvaluation(): Promise<(ProbabilityEvaluation & { createdAt: Date }) | null>
    /** Replaces all rows of the v2 model in one transaction. */
    replaceMatchProbabilities(rows: PlayerMatchProbability[]): Promise<void>
    /** Replaces all rows of the v2 model in one transaction. */
    replaceFixtureProbabilities(rows: FixtureProbabilityRow[]): Promise<void>
    findMatchProbabilities(playerId?: string): Promise<(PlayerMatchProbability & { createdAt: Date })[]>
    findFixtureProbabilities(fixtureIds?: string[]): Promise<FixtureProbabilityRow[]>
}

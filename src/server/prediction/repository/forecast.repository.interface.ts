import type { Evaluation } from '../lib/evaluation'

export interface PredictionRow {
    playerId: string
    expectedMinutes: number
    /** Calibrated expected FPL points. */
    expectedPoints: number
    rawPoints: number
    components: Record<string, number>
}

export interface IForecastRepository {
    saveEvaluation(e: Evaluation): Promise<void>
    /** Replaces all rows of the event and model version in one transaction. */
    replacePredictions(fplEvent: number, modelVersion: string, rows: PredictionRow[]): Promise<void>
    findLatestEvaluation(modelVersion: string): Promise<(Evaluation & { createdAt: Date }) | null>
    /** The event flagged next, else the first unfinished one. */
    findNextEventId(): Promise<number | null>
}

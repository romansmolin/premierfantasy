import type { GateResult } from '../lib/v2/evaluation'
import type {
    FixtureProbabilityRow,
    PlayerMatchProbability,
} from '../repository/probability.repository.interface'
import type { JobOutcome } from '@/server/sync/lib/job.types'

export interface ProbabilityStatus {
    evaluatedAt: Date | null
    eventsEvaluated: number
    gates: GateResult[]
    /** The v2 expected points passed the stage-2 bar and are no worse than v1. */
    pointsMeanOn: boolean
    /** When the probabilities were last stored; null before the first run. */
    updatedAt: Date | null
}

export interface IProbabilityService {
    /** Evaluates v2, stores the evaluation, then the next five matches of every FPL-mapped player and the outcomes of the next 8 events' fixtures. */
    run(): Promise<JobOutcome>
    getStatus(): Promise<ProbabilityStatus>
    getPlayerMatches(playerId: string): Promise<PlayerMatchProbability[]>
    /** Horizon-1 forecast of every player. */
    getNextMatchForAll(): Promise<Map<string, PlayerMatchProbability>>
    getFixtureProbabilities(fixtureIds?: string[]): Promise<FixtureProbabilityRow[]>
}

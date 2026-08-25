export interface IEnsureDemoParticipantsResult {
    competitionId: string
    realParticipants: number
    demoParticipantsBefore: number
    created: number
    skipped: number
}

export interface IUpdateDemoScoresResult {
    competitionId: string
    gameweeksConsidered: number
    rowsInserted: number
}

export interface IRecalculateDemoScoresResult {
    competitionId: string
    gameweeksConsidered: number
    /** Rows that did not exist and were created. */
    inserted: number
    /** Rows whose stored value had drifted from the deterministic one. */
    corrected: number
    /** Already correct — the normal steady-state outcome. */
    unchanged: number
    /** Rows dropped because they sat outside the competition's gameweek range. */
    pruned: number
    skippedFinalized: boolean
}

export interface IRecalculateAllResult {
    competitions: number
    inserted: number
    corrected: number
    unchanged: number
    pruned: number
    skippedFinalized: number
    errors: string[]
}

export interface IProcessCompetitionsResult {
    processed: number
    participantsCreated: number
    scoreRowsInserted: number
    finalized: number
    errors: string[]
}

export interface IDemoCompetitionService {
    /** Tops the competition up to the configured size with demo competitors. Idempotent. */
    ensureDemoParticipants(competitionId: string): Promise<IEnsureDemoParticipantsResult>
    /** Persists demo points for every elapsed gameweek that has none yet. Idempotent. */
    updateDemoScores(
        competitionId: string,
        options?: { includeUnfinished?: boolean },
    ): Promise<IUpdateDemoScoresResult>
    /** One cron tick: seed, score, and finalize everything that needs it. */
    processCompetitions(): Promise<IProcessCompetitionsResult>
    /**
     * Re-derives every demo team's points for a competition: fills gaps and
     * repairs drift. Finalized competitions are left alone.
     */
    recalculateDemoScores(competitionId: string): Promise<IRecalculateDemoScoresResult>
    /** Recalculation across every competition the cron is allowed to touch. */
    recalculateAllDemoScores(): Promise<IRecalculateAllResult>
}

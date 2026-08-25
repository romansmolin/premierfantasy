import type { DemoPoolPlayer } from '../lib/demo-roster'

export interface IDemoCompetitionRow {
    id: string
    name: string
    status: string
    startGameweek: number
    endGameweek: number
    demoScoringFinalizedAt: Date | null
    leagueSeasonId: string | null
    leagueId: string | null
    seasonYear: number | null
}

export interface IDemoTeamRow {
    id: string
    userId: string
    name: string
}

export interface IGameweekRow {
    id: string
    number: number
    endDate: Date
    isFinished: boolean
}

export interface IDemoRepository {
    findCompetition(competitionId: string): Promise<IDemoCompetitionRow | null>
    /** Competitions the cron should look at: joinable/live, or finished but not yet locked. */
    findCompetitionsForProcessing(): Promise<IDemoCompetitionRow[]>

    countRealTeams(competitionId: string): Promise<number>
    findDemoTeams(competitionId: string): Promise<IDemoTeamRow[]>

    /** Demo user by identity email; created (credential-less, isDemo) when missing. */
    ensureDemoUser(email: string, name: string): Promise<{ id: string }>
    ensureMembership(userId: string, leagueId: string, leagueSeasonId: string): Promise<void>
    findTeamByUserAndCompetition(userId: string, competitionId: string): Promise<{ id: string } | null>
    /** Team + full squad in one transaction, so a crash never leaves an empty demo team. */
    createDemoTeamWithSquad(data: {
        userId: string
        competitionId: string
        name: string
        budgetLeft: number
        players: DemoPoolPlayer[]
    }): Promise<void>

    /** League-scoped player pool; falls back to every local player when unscoped. */
    loadPlayerPool(leagueSeasonId: string | null, seasonYear: number | null): Promise<DemoPoolPlayer[]>

    findGameweeksInRange(startGw: number, endGw: number): Promise<IGameweekRow[]>
    /** (fantasyTeamId, gameweekId) pairs that already have a points row. */
    findExistingPointsKeys(teamIds: string[], gameweekIds: string[]): Promise<Set<string>>
    /** Stored points keyed by `${fantasyTeamId}:${gameweekId}` — for drift detection. */
    findPointsByKey(teamIds: string[], gameweekIds: string[]): Promise<Map<string, number>>
    /** Rewrites rows whose stored value drifted from the deterministic one. */
    updateGameweekPoints(
        rows: { fantasyTeamId: string; gameweekId: string; points: number }[],
    ): Promise<number>
    /**
     * Inserts points rows, silently skipping any (team, gameweek) pair that
     * already exists — the unique index is the concurrency guard.
     */
    insertGameweekPointsIfAbsent(
        rows: { fantasyTeamId: string; gameweekId: string; points: number }[],
    ): Promise<number>

    /**
     * Drops demo points that fall outside the competition's gameweek range —
     * left behind when a window is widened or moved. Real teams are never touched.
     */
    deleteDemoPointsOutsideRange(
        competitionId: string,
        startGameweek: number,
        endGameweek: number,
    ): Promise<number>

    markDemoScoringFinalized(competitionId: string): Promise<void>
}

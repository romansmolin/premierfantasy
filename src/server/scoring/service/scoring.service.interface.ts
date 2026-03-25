export interface IScoringService {
    calculateGameweek(gameweekId: string, season: number, leagueId: number): Promise<void>
}

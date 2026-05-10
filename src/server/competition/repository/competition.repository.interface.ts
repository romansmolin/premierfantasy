import type {
    ICompetition,
    ICreateCompetition,
    ILeaderboardEntry,
} from '@/entities/competition/model/competition.types'

export interface ICreateLeagueSeasonCompetition {
    leagueSeasonId: string
    name: string
    startGameweek: number
    endGameweek: number
    joinDeadline?: Date
    status: string
}

export interface ICompetitionBrowserRow {
    id: string
    name: string
    startGameweek: number
    endGameweek: number
    status: string
    joinDeadline: Date | null
    createdAt: Date
    league: {
        id: string
        name: string
        country: string
        logo: string | null
        type: string
    } | null
}

export interface ICompetitionRepository {
    findById(id: string): Promise<ICompetition | null>
    findAll(): Promise<ICompetition[]>
    findAllPremierLeague(): Promise<ICompetition[]>
    findActive(): Promise<ICompetition | null>
    findUpcoming(): Promise<ICompetition | null>
    findByGameweekRange(startGw: number, endGw: number): Promise<ICompetition | null>
    findActiveByLeagueSeasonId(leagueSeasonId: string): Promise<ICompetition | null>
    findLatestByLeagueSeasonId(leagueSeasonId: string): Promise<ICompetition | null>
    findAllForBrowser(): Promise<ICompetitionBrowserRow[]>
    create(data: ICreateCompetition): Promise<ICompetition>
    createForLeagueSeason(data: ICreateLeagueSeasonCompetition): Promise<ICompetition>
    update(id: string, data: Partial<ICreateCompetition>): Promise<ICompetition>
    delete(id: string): Promise<void>
    getLeaderboard(competitionId: string): Promise<ILeaderboardEntry[]>
    updateStatus(id: string, status: string): Promise<void>
    updateJoinDeadline(id: string, joinDeadline: Date): Promise<void>
}

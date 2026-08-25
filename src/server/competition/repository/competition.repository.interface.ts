import type {
    ICompetition,
    ICompetitionDetail,
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
    leagueSeasonId?: string | null
    league: {
        id: string
        name: string
        country: string
        logo: string | null
        type: string
    } | null
}

/** Where a competition sits in the league/season tree — what membership checks need. */
export interface ICompetitionLeagueContext {
    id: string
    name: string
    status: string
    joinDeadline: Date | null
    leagueSeasonId: string | null
    leagueId: string | null
}

/** Where one user sits in a competition, without shipping the whole leaderboard. */
export interface IUserStanding {
    rank: number
    totalPoints: number
    participants: number
}

export interface ICompetitionRepository {
    findLeagueContext(id: string): Promise<ICompetitionLeagueContext | null>
    getUserStandings(userId: string, competitionIds: string[]): Promise<Map<string, IUserStanding>>
    findByLeagueSeasonIds(leagueSeasonIds: string[]): Promise<ICompetitionBrowserRow[]>
    findById(id: string): Promise<ICompetition | null>
    findAll(): Promise<ICompetition[]>
    findAllPremierLeague(): Promise<ICompetition[]>
    findActivePremierLeague(): Promise<ICompetition | null>
    findUpcomingPremierLeague(): Promise<ICompetition | null>
    findDetailById(id: string): Promise<ICompetitionDetail | null>
    findActiveWithUserTeam(userId: string): Promise<ICompetitionDetail | null>
    findJoinableActive(now: Date): Promise<ICompetitionDetail | null>
    findUpcomingAny(): Promise<ICompetitionDetail | null>
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
    updateGameweekRange(id: string, startGameweek: number, endGameweek: number): Promise<void>
}

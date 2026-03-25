export type CompetitionStatus = 'upcoming' | 'active' | 'completed'

export interface ICompetition {
    id: string
    name: string
    startGameweek: number
    endGameweek: number
    status: CompetitionStatus
    joinDeadline: Date | null
    createdAt: Date
}

export interface ICreateCompetition {
    name: string
    startGameweek: number
    endGameweek: number
    joinDeadline?: Date
}

export interface ICompetitionState {
    activeCompetition: ICompetition | null
    upcomingCompetition: ICompetition | null
    hasTeamInActive: boolean
    hasTeamInUpcoming: boolean
    canJoinActive: boolean
    canJoinUpcoming: boolean
    userRankInActive: number | null
    userPointsInActive: number | null
}

export interface ILeaderboardEntry {
    rank: number
    fantasyTeamId: string
    fantasyTeamName: string
    userId: string
    userName: string
    gameweekPoints: number
    totalPoints: number
}

export interface ILeaderboard {
    competitionId: string
    competitionName: string
    currentGameweek: number
    entries: ILeaderboardEntry[]
}

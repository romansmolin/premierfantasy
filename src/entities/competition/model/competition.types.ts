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

export interface ICompetitionLeague {
    id: string
    externalId: number
    name: string
    country: string
    logo: string | null
    type: string
}

/** A competition plus the league/season it belongs to. Drives the team builder. */
export interface ICompetitionDetail extends ICompetition {
    league: ICompetitionLeague | null
    leagueSeasonId: string | null
    seasonYear: number | null
}

export interface ICreateCompetition {
    name: string
    startGameweek: number
    endGameweek: number
    joinDeadline?: Date
}

export interface ICompetitionState {
    activeCompetition: ICompetitionDetail | null
    upcomingCompetition: ICompetitionDetail | null
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

export interface ICompetitionBrowserRow {
    id: string
    name: string
    startGameweek: number
    endGameweek: number
    status: string
    joinDeadline: string | null
    createdAt: string
    league: {
        id: string
        name: string
        country: string
        logo: string | null
        type: string
    } | null
}

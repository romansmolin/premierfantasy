export interface IMyLeagueCompetition {
    id: string
    name: string
    startGameweek: number
    endGameweek: number
    status: string
    joinDeadline: string | null
}

export interface IMyLeagueTeam {
    id: string
    name: string
    competitionId: string
    playerCount: number
    /** A full 11-player squad — anything less still needs finishing in the builder. */
    isComplete: boolean
    /** Null until the competition has scored a gameweek. */
    rank: number | null
    totalPoints: number | null
}

/** One row of "My Leagues": the league, the season joined, and where the user stands in it. */
export interface IMyLeague {
    membershipId: string
    joinedAt: string
    league: {
        id: string
        externalId: number
        name: string
        country: string
        logo: string | null
        type: string
    }
    season: {
        id: string
        year: number
        startDate: string
        endDate: string
    }
    activeCompetition: IMyLeagueCompetition | null
    nextCompetition: IMyLeagueCompetition | null
    fantasyTeam: IMyLeagueTeam | null
    participantCount: number
}

export interface IJoinLeagueResult {
    membershipId: string
    leagueId: string
    leagueSeasonId: string
    seasonYear: number
    /** True when the user was already enrolled — the join was a no-op. */
    alreadyMember: boolean
}

export interface ILeagueParticipant {
    membershipId: string
    userId: string
    userName: string
    joinedAt: string
}

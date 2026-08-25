export interface ILeagueMembershipRow {
    id: string
    userId: string
    leagueId: string
    leagueSeasonId: string
    isDemo: boolean
    joinedAt: Date
}

/** A membership joined with the league and season it belongs to. */
export interface IMembershipWithLeagueRow extends ILeagueMembershipRow {
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
        startDate: Date
        endDate: Date
        isCurrent: boolean
    }
    user: {
        id: string
        name: string
        isDemo: boolean
    }
}

export interface ICreateLeagueMembership {
    userId: string
    leagueId: string
    leagueSeasonId: string
    isDemo?: boolean
}

export interface ILeagueMembershipRepository {
    findByUser(userId: string): Promise<IMembershipWithLeagueRow[]>
    findByUserAndSeason(userId: string, leagueSeasonId: string): Promise<ILeagueMembershipRow | null>
    /** Idempotent — an existing membership is returned untouched instead of duplicated. */
    upsert(data: ICreateLeagueMembership): Promise<ILeagueMembershipRow>
    countsByLeagueSeasonIds(leagueSeasonIds: string[]): Promise<Map<string, number>>
    listBySeason(leagueSeasonId: string): Promise<IMembershipWithLeagueRow[]>
    delete(userId: string, leagueSeasonId: string): Promise<void>
}

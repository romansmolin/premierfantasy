export type LeagueState = 'LIVE' | 'SOON' | 'OFF_SEASON'

export interface ILeagueRow {
    id: string
    externalId: number
    name: string
    country: string
    logo: string | null
    type: string
    seasonStartMonth: number
}

export interface ILeagueSeasonRow {
    id: string
    leagueId: string
    year: number
    startDate: Date
    endDate: Date
    isCurrent: boolean
}

export interface ICompetitionRow {
    id: string
    name: string
    startGameweek: number
    endGameweek: number
    status: string
    joinDeadline: Date | null
    leagueSeasonId: string | null
    createdAt: Date
}

export interface IInProgressSeason {
    seasonId: string
    leagueId: string
    leagueName: string
    year: number
    startDate: Date
    endDate: Date
}

export interface ILeagueRepository {
    findActiveLeagues(): Promise<ILeagueRow[]>
    findSeasonsByLeagueIds(leagueIds: string[]): Promise<ILeagueSeasonRow[]>
    findPublicCompetitionsByLeagueSeasonIds(leagueSeasonIds: string[]): Promise<ICompetitionRow[]>
    findInProgressSeasons(now: Date): Promise<IInProgressSeason[]>
    isLeagueByExternalId(leagueId: string, externalId: number): Promise<boolean>
}

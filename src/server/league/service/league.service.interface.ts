import type { LeagueState } from '../repository/league.repository.interface'

export interface IBrowserCompetition {
    id: string
    name: string
    startGameweek: number
    endGameweek: number
    joinDeadline: string | null
}

export interface IBrowserNextCompetition extends IBrowserCompetition {
    daysUntilStart: number
}

export interface ILeagueBrowserItem {
    league: {
        id: string
        externalId: number
        name: string
        country: string
        logo: string | null
        type: string
    }
    state: LeagueState
    currentSeason: {
        year: number
        startDate: string
        endDate: string
    } | null
    activeCompetition: IBrowserCompetition | null
    nextCompetition: IBrowserNextCompetition | null
}

export interface ILeagueService {
    getBrowser(): Promise<ILeagueBrowserItem[]>
}

export type LeagueState = 'LIVE' | 'SOON' | 'OFF_SEASON'

export interface BrowserCompetition {
    id: string
    name: string
    startGameweek: number
    endGameweek: number
    joinDeadline: string | null
}

export interface BrowserNextCompetition extends BrowserCompetition {
    daysUntilStart: number
}

export interface LeagueBrowserItem {
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
    activeCompetition: BrowserCompetition | null
    nextCompetition: BrowserNextCompetition | null
}

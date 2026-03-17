export interface IApiFootballResponse<T> {
    get: string
    parameters: Record<string, string>
    errors: Record<string, string>
    results: number
    paging: { current: number; total: number }
    response: T
}

export interface ITeam {
    id: number
    name: string
    code: string | null
    country: string
    founded: number | null
    national: boolean
    logo: string
}

export interface IVenue {
    id: number
    name: string
    address: string | null
    city: string
    capacity: number
    surface: string | null
    image: string
}

export interface ITeamResponse {
    team: ITeam
    venue: IVenue
}

export interface ISquadPlayer {
    id: number
    name: string
    age: number | null
    number: number | null
    position: string
    photo: string
}

export interface ISquadResponse {
    team: { id: number; name: string; logo: string }
    players: ISquadPlayer[]
}

export interface ITeamStatistics {
    league: { id: number; name: string; country: string; logo: string; flag: string; season: number }
    team: { id: number; name: string; logo: string }
    form: string
    fixtures: {
        played: { home: number; away: number; total: number }
        wins: { home: number; away: number; total: number }
        draws: { home: number; away: number; total: number }
        loses: { home: number; away: number; total: number }
    }
    goals: {
        for: {
            total: { home: number; away: number; total: number }
            average: { home: string; away: string; total: string }
        }
        against: {
            total: { home: number; away: number; total: number }
            average: { home: string; away: string; total: string }
        }
    }
}

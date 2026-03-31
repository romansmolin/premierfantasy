export interface IPlayerDetails {
    player: {
        id: number
        name: string
        firstname: string
        lastname: string
        age: number
        nationality: string
        height: string | null
        weight: string | null
        photo: string
        birth: { date: string | null; place: string | null; country: string | null }
    }
    statistics: IPlayerSeasonStats[]
}

export interface IPlayerSeasonStats {
    team: { id: number; name: string; logo: string }
    league: { id: number; name: string; country: string; logo: string; season: number }
    games: { appearences: number | null; minutes: number | null; position: string; rating: string | null }
    goals: { total: number | null; assists: number | null }
    passes: { total: number | null; accuracy: number | null }
    tackles: { total: number | null; interceptions: number | null }
    duels: { total: number | null; won: number | null }
    dribbles: { attempts: number | null; success: number | null }
    fouls: { drawn: number | null; committed: number | null }
    cards: { yellow: number | null; red: number | null }
    penalty: { scored: number | null; missed: number | null }
}

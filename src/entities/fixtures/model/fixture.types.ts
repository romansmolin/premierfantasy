export interface IFixture {
    id: number
    date: string
    status: string
    homeTeam: { id: number; name: string; logo: string }
    awayTeam: { id: number; name: string; logo: string }
    goals: { home: number | null; away: number | null }
    round: string
}

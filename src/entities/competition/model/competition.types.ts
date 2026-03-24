export interface ICompetition {
    id: string
    name: string
    startGameweek: number
    endGameweek: number
    createdAt: Date
}

export interface ICreateCompetition {
    name: string
    startGameweek: number
    endGameweek: number
}

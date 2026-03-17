export interface IFantasyTeam {
    id: string
    userId: string
    competitionId: string
    name: string
    budgetTotal: number
    budgetLeft: number
    createdAt: Date
}

export interface ICreateFantasyTeam {
    userId: string
    competitionId: string
    name: string
    budgetLeft: number
}

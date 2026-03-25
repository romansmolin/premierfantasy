export interface IGameweek {
    id: string
    number: number
    startDate: Date
    endDate: Date
    isActive: boolean
    isFinished: boolean
    createdAt: Date
}

export interface ICreateGameweek {
    number: number
    startDate: Date
    endDate: Date
}

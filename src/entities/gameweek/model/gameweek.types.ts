export interface IGameweek {
    id: string
    number: number
    startDate: Date
    endDate: Date
    isActive: boolean
    isFinished: boolean
    deadline: Date | null
    createdAt: Date
}

export interface ICreateGameweek {
    number: number
    startDate: Date
    endDate: Date
}

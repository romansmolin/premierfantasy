import type { ICompetition, ICreateCompetition } from '@/entities/competition/model/competition.types'

export interface ICompetitionService {
    getCompetition(id: string): Promise<ICompetition | null>
    getAllCompetitions(): Promise<ICompetition[]>
    createCompetition(data: ICreateCompetition): Promise<ICompetition>
    updateCompetition(id: string, data: Partial<ICreateCompetition>): Promise<ICompetition>
    deleteCompetition(id: string): Promise<void>
}

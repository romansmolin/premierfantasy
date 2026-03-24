import type { ICompetition, ICreateCompetition } from '@/entities/competition/model/competition.types'

export interface ICompetitionRepository {
    findById(id: string): Promise<ICompetition | null>
    findAll(): Promise<ICompetition[]>
    create(data: ICreateCompetition): Promise<ICompetition>
    update(id: string, data: Partial<ICreateCompetition>): Promise<ICompetition>
    delete(id: string): Promise<void>
}

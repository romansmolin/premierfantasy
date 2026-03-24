import type { ICompetition, ICreateCompetition } from '@/entities/competition/model/competition.types'

import type { ICompetitionService } from './competition.service.interface'
import type { ICompetitionRepository } from '../repository/competition.repository.interface'

export class CompetitionService implements ICompetitionService {
    private readonly competitionRepository

    constructor(competitionRepository: ICompetitionRepository) {
        this.competitionRepository = competitionRepository
    }

    async getCompetition(id: string): Promise<ICompetition | null> {
        return this.competitionRepository.findById(id)
    }

    async getAllCompetitions(): Promise<ICompetition[]> {
        return this.competitionRepository.findAll()
    }

    async createCompetition(data: ICreateCompetition): Promise<ICompetition> {
        return this.competitionRepository.create(data)
    }

    async updateCompetition(id: string, data: Partial<ICreateCompetition>): Promise<ICompetition> {
        return this.competitionRepository.update(id, data)
    }

    async deleteCompetition(id: string): Promise<void> {
        return this.competitionRepository.delete(id)
    }
}

import type { ICompetition, ICreateCompetition } from '@/entities/competition/model/competition.types'

import { prisma } from '@/shared/lib/prisma'

import type { ICompetitionRepository } from './competition.repository.interface'

export class CompetitionRepository implements ICompetitionRepository {
    async findById(id: string): Promise<ICompetition | null> {
        return prisma.competition.findUnique({ where: { id } })
    }

    async findAll(): Promise<ICompetition[]> {
        return prisma.competition.findMany()
    }

    async create(data: ICreateCompetition): Promise<ICompetition> {
        return prisma.competition.create({ data })
    }

    async update(id: string, data: Partial<ICreateCompetition>): Promise<ICompetition> {
        return prisma.competition.update({ where: { id }, data })
    }

    async delete(id: string): Promise<void> {
        await prisma.competition.delete({ where: { id } })
    }
}

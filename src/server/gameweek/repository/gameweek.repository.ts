import type { ICreateGameweek, IGameweek } from '@/entities/gameweek/model/gameweek.types'

import { prisma } from '@/shared/lib/prisma'

import type { IGameweekRepository } from './gameweek.repository.interface'

export class GameweekRepository implements IGameweekRepository {
    async findAll(): Promise<IGameweek[]> {
        return prisma.gameweek.findMany({ orderBy: { number: 'asc' } })
    }

    async findById(id: string): Promise<IGameweek | null> {
        return prisma.gameweek.findUnique({ where: { id } })
    }

    async findByNumber(number: number): Promise<IGameweek | null> {
        return prisma.gameweek.findUnique({ where: { number } })
    }

    async findActive(): Promise<IGameweek | null> {
        return prisma.gameweek.findFirst({ where: { isActive: true } })
    }

    async create(data: ICreateGameweek): Promise<IGameweek> {
        return prisma.gameweek.create({ data })
    }

    async upsertByNumber(data: ICreateGameweek & { deadline?: Date }): Promise<IGameweek> {
        return prisma.gameweek.upsert({
            where: { number: data.number },
            create: {
                number: data.number,
                startDate: data.startDate,
                endDate: data.endDate,
                deadline: data.deadline,
            },
            update: {
                startDate: data.startDate,
                endDate: data.endDate,
                deadline: data.deadline,
            },
        })
    }

    async setActive(gameweekId: string): Promise<IGameweek> {
        const [, activated] = await prisma.$transaction([
            prisma.gameweek.updateMany({
                where: { isActive: true },
                data: { isActive: false },
            }),
            prisma.gameweek.update({
                where: { id: gameweekId },
                data: { isActive: true },
            }),
        ])

        return activated
    }

    async setFinished(gameweekId: string): Promise<IGameweek> {
        return prisma.gameweek.update({
            where: { id: gameweekId },
            data: { isFinished: true, isActive: false },
        })
    }

    async findCurrentByDate(now: Date): Promise<IGameweek | null> {
        return prisma.gameweek.findFirst({
            where: {
                startDate: { lte: now },
                endDate: { gte: now },
            },
        })
    }

    async findUnfinishedBefore(date: Date): Promise<IGameweek[]> {
        return prisma.gameweek.findMany({
            where: {
                endDate: { lt: date },
                isFinished: false,
            },
            orderBy: { number: 'asc' },
        }) as Promise<IGameweek[]>
    }
}

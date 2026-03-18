import type { ICreateFantasyTeam, IFantasyTeam } from '@/entities/fantasy-team/model/fantasy-team.types'

import { prisma } from '@/shared/lib/prisma'

import type { IFantasyTeamRepository } from './fantasy-team.repository.interface'

export class FantasyTeamRepository implements IFantasyTeamRepository {
    async findById(id: string): Promise<IFantasyTeam | null> {
        return prisma.fantasyTeam.findUnique({ where: { id } })
    }

    async findByUserId(userId: string): Promise<IFantasyTeam[]> {
        return prisma.fantasyTeam.findMany({ where: { userId } })
    }

    async findByUserAndCompetition(userId: string, competitionId: string): Promise<IFantasyTeam | null> {
        return prisma.fantasyTeam.findUnique({
            where: { userId_competitionId: { userId, competitionId } },
        })
    }

    async findAll(): Promise<IFantasyTeam[]> {
        return prisma.fantasyTeam.findMany()
    }

    async create(data: ICreateFantasyTeam): Promise<IFantasyTeam> {
        return prisma.fantasyTeam.create({ data })
    }

    async update(id: string, data: Partial<IFantasyTeam>): Promise<IFantasyTeam> {
        return prisma.fantasyTeam.update({ where: { id }, data })
    }

    async delete(id: string): Promise<void> {
        await prisma.fantasyTeam.delete({ where: { id } })
    }

    async saveSquadPlayers(
        fantasyTeamId: string,
        players: { playerId: number; position: 'GK' | 'DEF' | 'MID' | 'FWD'; purchasePrice: number }[],
    ): Promise<void> {
        const budgetUsed = players.reduce((sum, p) => sum + p.purchasePrice, 0)

        await prisma.$transaction([
            prisma.fantasyTeamPlayer.deleteMany({ where: { fantasyTeamId } }),
            ...players.map((p) =>
                prisma.fantasyTeamPlayer.create({
                    data: {
                        fantasyTeamId,
                        player: { connect: { externalId: p.playerId } },
                        position: p.position,
                        purchasePrice: p.purchasePrice,
                    },
                }),
            ),
            prisma.fantasyTeam.update({
                where: { id: fantasyTeamId },
                data: { budgetLeft: 100 - budgetUsed },
            }),
        ])
    }
}

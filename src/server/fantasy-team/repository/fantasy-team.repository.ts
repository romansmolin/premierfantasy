import type { ICreateFantasyTeam, IFantasyTeam } from '@/entities/fantasy-team/model/fantasy-team.types'

import { prisma } from '@/shared/lib/prisma'

import type { IFantasyTeamRepository, SquadPlayerRow } from './fantasy-team.repository.interface'

export class FantasyTeamRepository implements IFantasyTeamRepository {
    async getSquadPlayers(fantasyTeamId: string): Promise<SquadPlayerRow[]> {
        const rows = await prisma.fantasyTeamPlayer.findMany({
            where: { fantasyTeamId },
            include: {
                player: {
                    include: { team: { select: { externalId: true } } },
                },
            },
        })

        return rows.map((r) => ({
            externalId: r.player.externalId,
            name: r.player.name,
            position: r.player.position as SquadPlayerRow['position'],
            teamExternalId: r.player.team.externalId,
            purchasePrice: r.purchasePrice,
        }))
    }

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
        players: {
            playerId: number
            name: string
            position: 'GK' | 'DEF' | 'MID' | 'FWD'
            purchasePrice: number
            teamId: number
        }[],
    ): Promise<void> {
        const budgetUsed = players.reduce((sum, p) => sum + p.purchasePrice, 0)
        const uniqueTeamIds = [...new Set(players.map((p) => p.teamId))]

        await Promise.all(
            uniqueTeamIds.map((teamId) =>
                prisma.team.upsert({
                    where: { externalId: teamId },
                    create: { externalId: teamId, name: `Team ${teamId}`, shortName: `T${teamId}` },
                    update: {},
                }),
            ),
        )

        await Promise.all(
            players.map((p) =>
                prisma.player.upsert({
                    where: { externalId: p.playerId },
                    create: {
                        externalId: p.playerId,
                        name: p.name,
                        position: p.position,
                        team: { connect: { externalId: p.teamId } },
                    },
                    update: { name: p.name, position: p.position },
                }),
            ),
        )

        const playerRecords = await prisma.player.findMany({
            where: { externalId: { in: players.map((p) => p.playerId) } },
            select: { id: true, externalId: true },
        })

        const externalToId = new Map(playerRecords.map((r) => [r.externalId, r.id]))

        await prisma.$transaction([
            prisma.fantasyTeamPlayer.deleteMany({ where: { fantasyTeamId } }),
            ...players.map((p) =>
                prisma.fantasyTeamPlayer.create({
                    data: {
                        fantasyTeamId,
                        playerId: externalToId.get(p.playerId)!,
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

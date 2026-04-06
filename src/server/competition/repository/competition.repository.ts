import type {
    ICompetition,
    ICreateCompetition,
    ILeaderboardEntry,
} from '@/entities/competition/model/competition.types'

import { prisma } from '@/shared/lib/prisma'

import type { ICompetitionRepository } from './competition.repository.interface'

export class CompetitionRepository implements ICompetitionRepository {
    async findById(id: string): Promise<ICompetition | null> {
        return prisma.competition.findUnique({ where: { id } }) as Promise<ICompetition | null>
    }

    async findAll(): Promise<ICompetition[]> {
        return prisma.competition.findMany({ orderBy: { startGameweek: 'asc' } }) as Promise<ICompetition[]>
    }

    async findActive(): Promise<ICompetition | null> {
        return prisma.competition.findFirst({ where: { status: 'active' } }) as Promise<ICompetition | null>
    }

    async findUpcoming(): Promise<ICompetition | null> {
        return prisma.competition.findFirst({
            where: { status: 'upcoming' },
            orderBy: { startGameweek: 'asc' },
        }) as Promise<ICompetition | null>
    }

    async findByGameweekRange(startGw: number, endGw: number): Promise<ICompetition | null> {
        return prisma.competition.findFirst({
            where: { startGameweek: startGw, endGameweek: endGw },
        }) as Promise<ICompetition | null>
    }

    async create(data: ICreateCompetition): Promise<ICompetition> {
        return prisma.competition.create({ data }) as Promise<ICompetition>
    }

    async update(id: string, data: Partial<ICreateCompetition>): Promise<ICompetition> {
        return prisma.competition.update({ where: { id }, data }) as Promise<ICompetition>
    }

    async delete(id: string): Promise<void> {
        await prisma.competition.delete({ where: { id } })
    }

    async getLeaderboard(competitionId: string): Promise<ILeaderboardEntry[]> {
        const competition = await prisma.competition.findUniqueOrThrow({
            where: { id: competitionId },
        })

        const teams = await prisma.fantasyTeam.findMany({
            where: { competitionId },
            include: {
                user: { select: { id: true, name: true } },
                points: {
                    include: { gameweek: { select: { number: true } } },
                    where: {
                        gameweek: {
                            number: {
                                gte: competition.startGameweek,
                                lte: competition.endGameweek,
                            },
                        },
                    },
                },
            },
        })

        const entries = teams.map((team) => {
            const totalPoints = team.points.reduce((sum, p) => sum + p.points, 0)
            const sortedGws = [...team.points].sort((a, b) => b.gameweek.number - a.gameweek.number)
            const latestWithPoints = sortedGws.find((p) => p.points > 0)

            return {
                rank: 0,
                fantasyTeamId: team.id,
                fantasyTeamName: team.name,
                userId: team.user.id,
                userName: team.user.name,
                gameweekPoints: latestWithPoints?.points ?? sortedGws[0]?.points ?? 0,
                totalPoints,
            }
        })

        entries.sort((a, b) => b.totalPoints - a.totalPoints)
        entries.forEach((e, i) => {
            e.rank = i + 1
        })

        return entries
    }

    async updateStatus(id: string, status: string): Promise<void> {
        await prisma.competition.update({ where: { id }, data: { status } })
    }
}

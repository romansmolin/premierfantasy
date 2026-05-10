import type {
    ICompetition,
    ICreateCompetition,
    ILeaderboardEntry,
} from '@/entities/competition/model/competition.types'

import { LEAGUE_ID } from '@/shared/config/league'
import { prisma } from '@/shared/lib/prisma'

import type {
    ICompetitionBrowserRow,
    ICompetitionRepository,
    ICreateLeagueSeasonCompetition,
} from './competition.repository.interface'

/**
 * Filter that restricts a competition query to the Premier League flow:
 * either a legacy PL seed competition with no leagueSeasonId, or one
 * linked to a LeagueSeason whose league has externalId === LEAGUE_ID.
 *
 * Multi-league auto-generated competitions (handled by
 * ensureCompetitionsForActiveSeasons) are intentionally excluded so the
 * gameweek-based PL transition logic doesn't touch them.
 */
const PREMIER_LEAGUE_FILTER = {
    OR: [{ leagueSeasonId: null }, { leagueSeason: { is: { league: { is: { externalId: LEAGUE_ID } } } } }],
}

export class CompetitionRepository implements ICompetitionRepository {
    async findById(id: string): Promise<ICompetition | null> {
        return prisma.competition.findUnique({ where: { id } }) as Promise<ICompetition | null>
    }

    async findAll(): Promise<ICompetition[]> {
        return prisma.competition.findMany({ orderBy: { startGameweek: 'asc' } }) as Promise<ICompetition[]>
    }

    async findAllPremierLeague(): Promise<ICompetition[]> {
        return prisma.competition.findMany({
            where: PREMIER_LEAGUE_FILTER,
            orderBy: { startGameweek: 'asc' },
        }) as Promise<ICompetition[]>
    }

    async findActive(): Promise<ICompetition | null> {
        return prisma.competition.findFirst({
            where: { status: 'active', ...PREMIER_LEAGUE_FILTER },
        }) as Promise<ICompetition | null>
    }

    async findUpcoming(): Promise<ICompetition | null> {
        return prisma.competition.findFirst({
            where: { status: 'upcoming', ...PREMIER_LEAGUE_FILTER },
            orderBy: { startGameweek: 'asc' },
        }) as Promise<ICompetition | null>
    }

    async findByGameweekRange(startGw: number, endGw: number): Promise<ICompetition | null> {
        return prisma.competition.findFirst({
            where: { startGameweek: startGw, endGameweek: endGw },
        }) as Promise<ICompetition | null>
    }

    async findAllForBrowser(): Promise<ICompetitionBrowserRow[]> {
        const rows = await prisma.competition.findMany({
            where: { visibility: 'PUBLIC' },
            orderBy: [{ status: 'asc' }, { joinDeadline: 'asc' }, { createdAt: 'desc' }],
            select: {
                id: true,
                name: true,
                startGameweek: true,
                endGameweek: true,
                status: true,
                joinDeadline: true,
                createdAt: true,
                leagueSeason: {
                    select: {
                        league: {
                            select: { id: true, name: true, country: true, logo: true, type: true },
                        },
                    },
                },
            },
        })

        return rows.map((r) => ({
            id: r.id,
            name: r.name,
            startGameweek: r.startGameweek,
            endGameweek: r.endGameweek,
            status: r.status,
            joinDeadline: r.joinDeadline,
            createdAt: r.createdAt,
            league: r.leagueSeason?.league
                ? {
                      id: r.leagueSeason.league.id,
                      name: r.leagueSeason.league.name,
                      country: r.leagueSeason.league.country,
                      logo: r.leagueSeason.league.logo,
                      type: r.leagueSeason.league.type,
                  }
                : null,
        }))
    }

    async findActiveByLeagueSeasonId(leagueSeasonId: string): Promise<ICompetition | null> {
        return prisma.competition.findFirst({
            where: { leagueSeasonId, status: 'active', visibility: 'PUBLIC' },
            orderBy: { createdAt: 'desc' },
        }) as Promise<ICompetition | null>
    }

    async findLatestByLeagueSeasonId(leagueSeasonId: string): Promise<ICompetition | null> {
        return prisma.competition.findFirst({
            where: { leagueSeasonId, visibility: 'PUBLIC' },
            orderBy: { createdAt: 'desc' },
        }) as Promise<ICompetition | null>
    }

    async create(data: ICreateCompetition): Promise<ICompetition> {
        return prisma.competition.create({ data }) as Promise<ICompetition>
    }

    async createForLeagueSeason(data: ICreateLeagueSeasonCompetition): Promise<ICompetition> {
        return prisma.competition.create({
            data: {
                leagueSeasonId: data.leagueSeasonId,
                name: data.name,
                startGameweek: data.startGameweek,
                endGameweek: data.endGameweek,
                status: data.status,
                joinDeadline: data.joinDeadline ?? null,
                visibility: 'PUBLIC',
            },
        }) as Promise<ICompetition>
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

    async updateJoinDeadline(id: string, joinDeadline: Date): Promise<void> {
        await prisma.competition.update({ where: { id }, data: { joinDeadline } })
    }
}

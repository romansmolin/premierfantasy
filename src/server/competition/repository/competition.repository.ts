import type {
    ICompetition,
    ICompetitionDetail,
    ICreateCompetition,
    ILeaderboardEntry,
} from '@/entities/competition/model/competition.types'

import { LEAGUE_ID } from '@/shared/config/league'
import { prisma } from '@/shared/lib/prisma'

import type {
    ICompetitionBrowserRow,
    ICompetitionLeagueContext,
    ICompetitionRepository,
    IUserStanding,
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

type CompetitionWithLeague = {
    id: string
    name: string
    startGameweek: number
    endGameweek: number
    status: string
    joinDeadline: Date | null
    createdAt: Date
    leagueSeasonId: string | null
    leagueSeason: {
        id: string
        year: number
        league: {
            id: string
            externalId: number
            name: string
            country: string
            logo: string | null
            type: string
        }
    } | null
}

const toDetail = (row: CompetitionWithLeague): ICompetitionDetail => ({
    id: row.id,
    name: row.name,
    startGameweek: row.startGameweek,
    endGameweek: row.endGameweek,
    status: row.status as ICompetitionDetail['status'],
    joinDeadline: row.joinDeadline,
    createdAt: row.createdAt,
    leagueSeasonId: row.leagueSeasonId,
    seasonYear: row.leagueSeason?.year ?? null,
    league: row.leagueSeason?.league
        ? {
              id: row.leagueSeason.league.id,
              externalId: row.leagueSeason.league.externalId,
              name: row.leagueSeason.league.name,
              country: row.leagueSeason.league.country,
              logo: row.leagueSeason.league.logo,
              type: row.leagueSeason.league.type,
          }
        : null,
})

export class CompetitionRepository implements ICompetitionRepository {
    async findById(id: string): Promise<ICompetition | null> {
        return prisma.competition.findUnique({ where: { id } }) as Promise<ICompetition | null>
    }

    async findLeagueContext(id: string): Promise<ICompetitionLeagueContext | null> {
        const row = await prisma.competition.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                status: true,
                joinDeadline: true,
                leagueSeasonId: true,
                leagueSeason: { select: { leagueId: true } },
            },
        })

        if (!row) return null

        return {
            id: row.id,
            name: row.name,
            status: row.status,
            joinDeadline: row.joinDeadline,
            leagueSeasonId: row.leagueSeasonId,
            leagueId: row.leagueSeason?.leagueId ?? null,
        }
    }

    /**
     * Ranks every team in the given competitions once and returns only the rows for
     * `userId` — one query for the whole dashboard instead of a leaderboard per card.
     */
    async getUserStandings(userId: string, competitionIds: string[]): Promise<Map<string, IUserStanding>> {
        const result = new Map<string, IUserStanding>()

        if (competitionIds.length === 0) return result

        const competitions = await prisma.competition.findMany({
            where: { id: { in: competitionIds } },
            select: { id: true, startGameweek: true, endGameweek: true },
        })

        const teams = await prisma.fantasyTeam.findMany({
            where: { competitionId: { in: competitionIds } },
            select: {
                id: true,
                userId: true,
                competitionId: true,
                points: {
                    select: { points: true, gameweek: { select: { number: true } } },
                },
            },
        })

        for (const competition of competitions) {
            const entries = teams
                .filter((team) => team.competitionId === competition.id)
                .map((team) => ({
                    userId: team.userId,
                    totalPoints: team.points
                        .filter(
                            (p) =>
                                p.gameweek.number >= competition.startGameweek &&
                                p.gameweek.number <= competition.endGameweek,
                        )
                        .reduce((sum, p) => sum + p.points, 0),
                }))
                .sort((a, b) => b.totalPoints - a.totalPoints)

            const index = entries.findIndex((entry) => entry.userId === userId)

            if (index === -1) continue

            result.set(competition.id, {
                rank: index + 1,
                totalPoints: entries[index].totalPoints,
                participants: entries.length,
            })
        }

        return result
    }

    async findByLeagueSeasonIds(leagueSeasonIds: string[]): Promise<ICompetitionBrowserRow[]> {
        if (leagueSeasonIds.length === 0) return []

        const rows = await prisma.competition.findMany({
            where: { leagueSeasonId: { in: leagueSeasonIds }, visibility: 'PUBLIC' },
            orderBy: [{ startGameweek: 'asc' }],
            select: {
                id: true,
                name: true,
                startGameweek: true,
                endGameweek: true,
                status: true,
                joinDeadline: true,
                createdAt: true,
                leagueSeasonId: true,
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
            leagueSeasonId: r.leagueSeasonId,
            league: r.leagueSeason?.league ?? null,
        }))
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

    async findActivePremierLeague(): Promise<ICompetition | null> {
        return prisma.competition.findFirst({
            where: { status: 'active', ...PREMIER_LEAGUE_FILTER },
        }) as Promise<ICompetition | null>
    }

    async findUpcomingPremierLeague(): Promise<ICompetition | null> {
        return prisma.competition.findFirst({
            where: { status: 'upcoming', ...PREMIER_LEAGUE_FILTER },
            orderBy: { startGameweek: 'asc' },
        }) as Promise<ICompetition | null>
    }

    async findDetailById(id: string): Promise<ICompetitionDetail | null> {
        const row = await prisma.competition.findUnique({
            where: { id },
            include: { leagueSeason: { include: { league: true } } },
        })

        return row ? toDetail(row) : null
    }

    /**
     * The active competition the user already manages a team in — regardless of
     * league. Most recently created wins if they somehow hold several.
     */
    async findActiveWithUserTeam(userId: string): Promise<ICompetitionDetail | null> {
        const row = await prisma.competition.findFirst({
            where: { status: 'active', teams: { some: { userId } } },
            orderBy: { createdAt: 'desc' },
            include: { leagueSeason: { include: { league: true } } },
        })

        return row ? toDetail(row) : null
    }

    /** The active public competition whose join window closes soonest. */
    async findJoinableActive(now: Date): Promise<ICompetitionDetail | null> {
        const row = await prisma.competition.findFirst({
            where: { status: 'active', visibility: 'PUBLIC', joinDeadline: { gt: now } },
            orderBy: { joinDeadline: 'asc' },
            include: { leagueSeason: { include: { league: true } } },
        })

        return row ? toDetail(row) : null
    }

    async findUpcomingAny(): Promise<ICompetitionDetail | null> {
        const row = await prisma.competition.findFirst({
            where: { status: 'upcoming', visibility: 'PUBLIC' },
            orderBy: [{ joinDeadline: 'asc' }, { startGameweek: 'asc' }],
            include: { leagueSeason: { include: { league: true } } },
        })

        return row ? toDetail(row) : null
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

    async updateGameweekRange(id: string, startGameweek: number, endGameweek: number): Promise<void> {
        await prisma.competition.update({ where: { id }, data: { startGameweek, endGameweek } })
    }
}

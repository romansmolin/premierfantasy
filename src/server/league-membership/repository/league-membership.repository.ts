import { prisma } from '@/shared/lib/prisma'

import type {
    ICreateLeagueMembership,
    ILeagueMembershipRepository,
    ILeagueMembershipRow,
    IMembershipWithLeagueRow,
} from './league-membership.repository.interface'

const withLeagueInclude = {
    league: {
        select: { id: true, externalId: true, name: true, country: true, logo: true, type: true },
    },
    leagueSeason: {
        select: { id: true, year: true, startDate: true, endDate: true, isCurrent: true },
    },
    user: {
        select: { id: true, name: true, isDemo: true },
    },
} as const

type RowWithLeague = ILeagueMembershipRow & {
    league: IMembershipWithLeagueRow['league']
    leagueSeason: IMembershipWithLeagueRow['season']
    user: IMembershipWithLeagueRow['user']
}

const toMembershipWithLeague = (row: RowWithLeague): IMembershipWithLeagueRow => ({
    id: row.id,
    userId: row.userId,
    leagueId: row.leagueId,
    leagueSeasonId: row.leagueSeasonId,
    isDemo: row.isDemo,
    joinedAt: row.joinedAt,
    league: row.league,
    season: row.leagueSeason,
    user: row.user,
})

export class LeagueMembershipRepository implements ILeagueMembershipRepository {
    async findByUser(userId: string): Promise<IMembershipWithLeagueRow[]> {
        const rows = await prisma.leagueMembership.findMany({
            where: { userId },
            orderBy: { joinedAt: 'desc' },
            include: withLeagueInclude,
        })

        return rows.map(toMembershipWithLeague)
    }

    async findByUserAndSeason(userId: string, leagueSeasonId: string): Promise<ILeagueMembershipRow | null> {
        return prisma.leagueMembership.findUnique({
            where: { userId_leagueSeasonId: { userId, leagueSeasonId } },
        })
    }

    async upsert(data: ICreateLeagueMembership): Promise<ILeagueMembershipRow> {
        return prisma.leagueMembership.upsert({
            where: {
                userId_leagueSeasonId: { userId: data.userId, leagueSeasonId: data.leagueSeasonId },
            },
            create: {
                userId: data.userId,
                leagueId: data.leagueId,
                leagueSeasonId: data.leagueSeasonId,
                isDemo: data.isDemo ?? false,
            },
            update: {},
        })
    }

    async countsByLeagueSeasonIds(leagueSeasonIds: string[]): Promise<Map<string, number>> {
        if (leagueSeasonIds.length === 0) return new Map()

        const rows = await prisma.leagueMembership.groupBy({
            by: ['leagueSeasonId'],
            where: { leagueSeasonId: { in: leagueSeasonIds } },
            _count: { _all: true },
        })

        return new Map(rows.map((r) => [r.leagueSeasonId, r._count._all]))
    }

    async listBySeason(leagueSeasonId: string): Promise<IMembershipWithLeagueRow[]> {
        const rows = await prisma.leagueMembership.findMany({
            where: { leagueSeasonId },
            orderBy: { joinedAt: 'asc' },
            include: withLeagueInclude,
        })

        return rows.map(toMembershipWithLeague)
    }

    async delete(userId: string, leagueSeasonId: string): Promise<void> {
        await prisma.leagueMembership.deleteMany({ where: { userId, leagueSeasonId } })
    }
}

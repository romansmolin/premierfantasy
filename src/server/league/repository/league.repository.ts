import { prisma } from '@/shared/lib/prisma'

import type {
    ICompetitionRow,
    IInProgressSeason,
    ILeagueRepository,
    ILeagueRow,
    ILeagueSeasonRow,
} from './league.repository.interface'

export class LeagueRepository implements ILeagueRepository {
    async findActiveLeagues(): Promise<ILeagueRow[]> {
        return prisma.league.findMany({
            where: { isActive: true },
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
            select: {
                id: true,
                externalId: true,
                name: true,
                country: true,
                logo: true,
                type: true,
                seasonStartMonth: true,
            },
        })
    }

    async findSeasonsByLeagueIds(leagueIds: string[]): Promise<ILeagueSeasonRow[]> {
        if (leagueIds.length === 0) return []

        return prisma.leagueSeason.findMany({
            where: { leagueId: { in: leagueIds } },
            select: {
                id: true,
                leagueId: true,
                year: true,
                startDate: true,
                endDate: true,
                isCurrent: true,
            },
        })
    }

    async findInProgressSeasons(now: Date): Promise<IInProgressSeason[]> {
        const seasons = await prisma.leagueSeason.findMany({
            where: { startDate: { lte: now }, endDate: { gte: now } },
            select: {
                id: true,
                year: true,
                startDate: true,
                endDate: true,
                league: { select: { id: true, name: true, isActive: true } },
            },
        })

        return seasons
            .filter((s) => s.league.isActive)
            .map((s) => ({
                seasonId: s.id,
                leagueId: s.league.id,
                leagueName: s.league.name,
                year: s.year,
                startDate: s.startDate,
                endDate: s.endDate,
            }))
    }

    async isLeagueByExternalId(leagueId: string, externalId: number): Promise<boolean> {
        const row = await prisma.league.findUnique({
            where: { id: leagueId },
            select: { externalId: true },
        })

        return row?.externalId === externalId
    }

    async findPublicCompetitionsByLeagueSeasonIds(leagueSeasonIds: string[]): Promise<ICompetitionRow[]> {
        if (leagueSeasonIds.length === 0) return []

        return prisma.competition.findMany({
            where: {
                leagueSeasonId: { in: leagueSeasonIds },
                visibility: 'PUBLIC',
                status: { in: ['active', 'upcoming'] },
            },
            orderBy: { joinDeadline: 'asc' },
            select: {
                id: true,
                name: true,
                startGameweek: true,
                endGameweek: true,
                status: true,
                joinDeadline: true,
                leagueSeasonId: true,
                createdAt: true,
            },
        })
    }
}

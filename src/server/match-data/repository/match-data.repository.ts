import { prisma } from '@/shared/lib/prisma'

import type { FixtureUpsert, IMatchDataRepository } from './match-data.repository.interface'

export class MatchDataRepository implements IMatchDataRepository {
    async findLeagueSeason(leagueExternalId: number, year: number): Promise<{ id: string } | null> {
        return prisma.leagueSeason.findFirst({
            where: { year, league: { externalId: leagueExternalId } },
            select: { id: true },
        })
    }

    async countFixtures(leagueSeasonId: string): Promise<number> {
        return prisma.fixture.count({ where: { leagueSeasonId } })
    }

    async findTeamIdsByExternalIds(externalIds: number[]): Promise<Map<number, string>> {
        const teams = await prisma.team.findMany({
            where: { externalId: { in: externalIds } },
            select: { id: true, externalId: true },
        })

        return new Map(teams.map((team) => [team.externalId, team.id]))
    }

    async upsertFixtures(rows: FixtureUpsert[]): Promise<{ inserted: number; updated: number }> {
        const existing = await prisma.fixture.findMany({
            where: { externalId: { in: rows.map((row) => row.externalId) } },
            select: { externalId: true },
        })
        const existingIds = new Set(existing.map((fixture) => fixture.externalId))

        await prisma.$transaction(
            rows.map((row) =>
                prisma.fixture.upsert({
                    where: { externalId: row.externalId },
                    create: row,
                    update: {
                        round: row.round,
                        roundNumber: row.roundNumber,
                        kickoff: row.kickoff,
                        status: row.status,
                        homeTeamId: row.homeTeamId,
                        awayTeamId: row.awayTeamId,
                        homeGoals: row.homeGoals,
                        awayGoals: row.awayGoals,
                    },
                }),
            ),
        )

        const updated = rows.filter((row) => existingIds.has(row.externalId)).length

        return { inserted: rows.length - updated, updated }
    }
}

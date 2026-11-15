import type { PlayerPosition } from '@/entities/players/model/player.types'

import { prisma } from '@/shared/lib/prisma'

import { MAX_STATS_ATTEMPTS } from './match-data.repository.interface'

import type {
    FixtureRef,
    FixtureUpsert,
    IMatchDataRepository,
    NewPlayer,
} from './match-data.repository.interface'
import type { PlayerMatchStatsRow } from '../lib/match-stats.types'

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

    async findFixturesNeedingStats(seasonYear: number, limit: number): Promise<FixtureRef[]> {
        return prisma.fixture.findMany({
            where: {
                leagueSeason: { year: seasonYear },
                status: { in: ['FT', 'AET', 'PEN'] },
                statsSyncedAt: null,
                statsAttempts: { lt: MAX_STATS_ATTEMPTS },
            },
            orderBy: { kickoff: 'desc' },
            take: limit,
            select: { id: true, externalId: true },
        })
    }

    async findPlayersByExternalIds(
        externalIds: number[],
    ): Promise<Map<number, { id: string; position: PlayerPosition }>> {
        const players = await prisma.player.findMany({
            where: { externalId: { in: externalIds } },
            select: { id: true, externalId: true, position: true },
        })

        return new Map(players.map((p) => [p.externalId, { id: p.id, position: p.position }]))
    }

    async createPlayers(rows: NewPlayer[]): Promise<Map<number, string>> {
        if (rows.length === 0) return new Map()

        await prisma.player.createMany({ data: rows, skipDuplicates: true })

        const players = await prisma.player.findMany({
            where: { externalId: { in: rows.map((row) => row.externalId) } },
            select: { id: true, externalId: true },
        })

        return new Map(players.map((p) => [p.externalId, p.id]))
    }

    async saveFixtureStats(fixtureId: string, rows: PlayerMatchStatsRow[]): Promise<void> {
        await prisma.$transaction([
            ...rows.map((row) =>
                prisma.playerMatchStats.upsert({
                    where: { fixtureId_playerId: { fixtureId, playerId: row.playerId } },
                    create: { fixtureId, ...row },
                    update: row,
                }),
            ),
            prisma.fixture.update({ where: { id: fixtureId }, data: { statsSyncedAt: new Date() } }),
        ])
    }

    async incrementStatsAttempts(fixtureId: string): Promise<void> {
        await prisma.fixture.update({ where: { id: fixtureId }, data: { statsAttempts: { increment: 1 } } })
    }
}

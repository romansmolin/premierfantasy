import { generatePlayerPrice } from '@/entities/players/model/player-price'
import type { PlayerPosition } from '@/entities/players/model/player.types'

import { prisma } from '@/shared/lib/prisma'

import type {
    IDemoCompetitionRow,
    IDemoRepository,
    IDemoTeamRow,
    IGameweekRow,
} from './demo.repository.interface'
import type { DemoPoolPlayer } from '../lib/demo-roster'

const competitionSelect = {
    id: true,
    name: true,
    status: true,
    startGameweek: true,
    endGameweek: true,
    demoScoringFinalizedAt: true,
    leagueSeasonId: true,
    leagueSeason: { select: { leagueId: true, year: true } },
} as const

type CompetitionRow = {
    id: string
    name: string
    status: string
    startGameweek: number
    endGameweek: number
    demoScoringFinalizedAt: Date | null
    leagueSeasonId: string | null
    leagueSeason: { leagueId: string; year: number } | null
}

const toCompetitionRow = (row: CompetitionRow): IDemoCompetitionRow => ({
    id: row.id,
    name: row.name,
    status: row.status,
    startGameweek: row.startGameweek,
    endGameweek: row.endGameweek,
    demoScoringFinalizedAt: row.demoScoringFinalizedAt,
    leagueSeasonId: row.leagueSeasonId,
    leagueId: row.leagueSeason?.leagueId ?? null,
    seasonYear: row.leagueSeason?.year ?? null,
})

export class DemoRepository implements IDemoRepository {
    async findCompetition(competitionId: string): Promise<IDemoCompetitionRow | null> {
        const row = await prisma.competition.findUnique({
            where: { id: competitionId },
            select: competitionSelect,
        })

        return row ? toCompetitionRow(row) : null
    }

    async findCompetitionsForProcessing(): Promise<IDemoCompetitionRow[]> {
        const rows = await prisma.competition.findMany({
            where: {
                visibility: 'PUBLIC',
                OR: [
                    { status: { in: ['active', 'upcoming'] } },
                    { status: 'completed', demoScoringFinalizedAt: null },
                ],
            },
            select: competitionSelect,
        })

        return rows.map(toCompetitionRow)
    }

    async countRealTeams(competitionId: string): Promise<number> {
        return prisma.fantasyTeam.count({ where: { competitionId, isDemo: false } })
    }

    async findDemoTeams(competitionId: string): Promise<IDemoTeamRow[]> {
        return prisma.fantasyTeam.findMany({
            where: { competitionId, isDemo: true },
            select: { id: true, userId: true, name: true },
        })
    }

    async ensureDemoUser(email: string, name: string): Promise<{ id: string }> {
        return prisma.user.upsert({
            where: { email },
            create: { email, name, emailVerified: false, isDemo: true },
            update: { isDemo: true },
            select: { id: true },
        })
    }

    async ensureMembership(userId: string, leagueId: string, leagueSeasonId: string): Promise<void> {
        await prisma.leagueMembership.upsert({
            where: { userId_leagueSeasonId: { userId, leagueSeasonId } },
            create: { userId, leagueId, leagueSeasonId, isDemo: true },
            update: { isDemo: true },
        })
    }

    async findTeamByUserAndCompetition(
        userId: string,
        competitionId: string,
    ): Promise<{ id: string } | null> {
        return prisma.fantasyTeam.findUnique({
            where: { userId_competitionId: { userId, competitionId } },
            select: { id: true },
        })
    }

    async createDemoTeamWithSquad(data: {
        userId: string
        competitionId: string
        name: string
        budgetLeft: number
        players: DemoPoolPlayer[]
    }): Promise<void> {
        await prisma.$transaction(async (tx) => {
            const team = await tx.fantasyTeam.create({
                data: {
                    userId: data.userId,
                    competitionId: data.competitionId,
                    name: data.name,
                    budgetLeft: data.budgetLeft,
                    isDemo: true,
                },
                select: { id: true },
            })

            await tx.fantasyTeamPlayer.createMany({
                data: data.players.map((player) => ({
                    fantasyTeamId: team.id,
                    playerId: player.id,
                    position: player.position,
                    purchasePrice: player.price,
                })),
            })
        })
    }

    async loadPlayerPool(
        leagueSeasonId: string | null,
        seasonYear: number | null,
    ): Promise<DemoPoolPlayer[]> {
        let teamIds: string[] | null = null

        if (leagueSeasonId) {
            const links = await prisma.leagueSeasonTeam.findMany({
                where: { leagueSeasonId },
                select: { teamId: true },
            })

            if (links.length > 0) teamIds = links.map((link) => link.teamId)
        }

        const players = await prisma.player.findMany({
            where: teamIds ? { teamId: { in: teamIds } } : {},
            select: {
                id: true,
                externalId: true,
                name: true,
                position: true,
                team: { select: { externalId: true } },
                seasonPrices: seasonYear
                    ? { where: { seasonYear }, select: { currentPrice: true } }
                    : { select: { currentPrice: true }, take: 1 },
            },
        })

        return players.map((player) => ({
            id: player.id,
            externalId: player.externalId,
            name: player.name,
            position: player.position as PlayerPosition,
            teamExternalId: player.team.externalId,
            price:
                player.seasonPrices[0]?.currentPrice ??
                generatePlayerPrice(player.externalId, player.position as PlayerPosition),
        }))
    }

    async findGameweeksInRange(startGw: number, endGw: number): Promise<IGameweekRow[]> {
        return prisma.gameweek.findMany({
            where: { number: { gte: startGw, lte: endGw } },
            orderBy: { number: 'asc' },
            select: { id: true, number: true, endDate: true, isFinished: true },
        })
    }

    async findExistingPointsKeys(teamIds: string[], gameweekIds: string[]): Promise<Set<string>> {
        if (teamIds.length === 0 || gameweekIds.length === 0) return new Set()

        const rows = await prisma.gameweekPoints.findMany({
            where: { fantasyTeamId: { in: teamIds }, gameweekId: { in: gameweekIds } },
            select: { fantasyTeamId: true, gameweekId: true },
        })

        return new Set(rows.map((row) => `${row.fantasyTeamId}:${row.gameweekId}`))
    }

    async findPointsByKey(teamIds: string[], gameweekIds: string[]): Promise<Map<string, number>> {
        if (teamIds.length === 0 || gameweekIds.length === 0) return new Map()

        const rows = await prisma.gameweekPoints.findMany({
            where: { fantasyTeamId: { in: teamIds }, gameweekId: { in: gameweekIds } },
            select: { fantasyTeamId: true, gameweekId: true, points: true },
        })

        return new Map(rows.map((row) => [`${row.fantasyTeamId}:${row.gameweekId}`, row.points]))
    }

    async updateGameweekPoints(
        rows: { fantasyTeamId: string; gameweekId: string; points: number }[],
    ): Promise<number> {
        if (rows.length === 0) return 0

        // updateMany keyed on the unique pair: safe to run concurrently, and a
        // racing writer simply sets the same deterministic value.
        const results = await prisma.$transaction(
            rows.map((row) =>
                prisma.gameweekPoints.updateMany({
                    where: { fantasyTeamId: row.fantasyTeamId, gameweekId: row.gameweekId },
                    data: { points: row.points },
                }),
            ),
        )

        return results.reduce((sum, result) => sum + result.count, 0)
    }

    async insertGameweekPointsIfAbsent(
        rows: { fantasyTeamId: string; gameweekId: string; points: number }[],
    ): Promise<number> {
        if (rows.length === 0) return 0

        const result = await prisma.gameweekPoints.createMany({ data: rows, skipDuplicates: true })

        return result.count
    }

    async deleteDemoPointsOutsideRange(
        competitionId: string,
        startGameweek: number,
        endGameweek: number,
    ): Promise<number> {
        const result = await prisma.gameweekPoints.deleteMany({
            where: {
                fantasyTeam: { is: { competitionId, isDemo: true } },
                gameweek: {
                    is: { OR: [{ number: { lt: startGameweek } }, { number: { gt: endGameweek } }] },
                },
            },
        })

        return result.count
    }

    async markDemoScoringFinalized(competitionId: string): Promise<void> {
        // updateMany + null filter: only the first finalizer writes the timestamp.
        await prisma.competition.updateMany({
            where: { id: competitionId, demoScoringFinalizedAt: null },
            data: { demoScoringFinalizedAt: new Date() },
        })
    }
}

import { prisma } from '@/shared/lib/prisma'

import type {
    IPlayerGameweekStatsRepository,
    PlayerLookupRow,
    PlayerStatsRow,
} from './player-gameweek-stats.repository.interface'

export class PlayerGameweekStatsRepository implements IPlayerGameweekStatsRepository {
    async upsert(data: PlayerStatsRow): Promise<void> {
        await prisma.playerGameweekStats.upsert({
            where: {
                playerId_gameweekId: {
                    playerId: data.playerId,
                    gameweekId: data.gameweekId,
                },
            },
            create: {
                playerId: data.playerId,
                gameweekId: data.gameweekId,
                minutesPlayed: data.minutesPlayed,
                goals: data.goals,
                assists: data.assists,
                cleanSheet: data.cleanSheet,
                saves: data.saves,
                penaltySaved: data.penaltySaved,
                penaltyMissed: data.penaltyMissed,
                goalsConceded: data.goalsConceded,
                yellowCards: data.yellowCards,
                redCards: data.redCards,
                ownGoals: data.ownGoals,
                totalPoints: data.totalPoints,
            },
            update: {
                minutesPlayed: data.minutesPlayed,
                goals: data.goals,
                assists: data.assists,
                cleanSheet: data.cleanSheet,
                saves: data.saves,
                penaltySaved: data.penaltySaved,
                penaltyMissed: data.penaltyMissed,
                goalsConceded: data.goalsConceded,
                yellowCards: data.yellowCards,
                redCards: data.redCards,
                ownGoals: data.ownGoals,
                totalPoints: data.totalPoints,
            },
        })
    }

    async upsertMany(data: PlayerStatsRow[]): Promise<void> {
        for (const row of data) {
            await this.upsert(row)
        }
    }

    async findByGameweek(gameweekId: string): Promise<PlayerStatsRow[]> {
        const rows = await prisma.playerGameweekStats.findMany({
            where: { gameweekId },
        })

        return rows.map((row) => ({
            playerId: row.playerId,
            gameweekId: row.gameweekId,
            minutesPlayed: row.minutesPlayed,
            goals: row.goals,
            assists: row.assists,
            cleanSheet: row.cleanSheet,
            saves: row.saves,
            penaltySaved: row.penaltySaved,
            penaltyMissed: row.penaltyMissed,
            goalsConceded: row.goalsConceded,
            yellowCards: row.yellowCards,
            redCards: row.redCards,
            ownGoals: row.ownGoals,
            totalPoints: row.totalPoints,
        }))
    }

    async findByPlayer(playerId: string): Promise<PlayerStatsRow[]> {
        const rows = await prisma.playerGameweekStats.findMany({
            where: { playerId },
        })

        return rows.map((row) => ({
            playerId: row.playerId,
            gameweekId: row.gameweekId,
            minutesPlayed: row.minutesPlayed,
            goals: row.goals,
            assists: row.assists,
            cleanSheet: row.cleanSheet,
            saves: row.saves,
            penaltySaved: row.penaltySaved,
            penaltyMissed: row.penaltyMissed,
            goalsConceded: row.goalsConceded,
            yellowCards: row.yellowCards,
            redCards: row.redCards,
            ownGoals: row.ownGoals,
            totalPoints: row.totalPoints,
        }))
    }

    async findByPlayerAndGameweek(playerId: string, gameweekId: string): Promise<PlayerStatsRow | null> {
        const row = await prisma.playerGameweekStats.findUnique({
            where: {
                playerId_gameweekId: { playerId, gameweekId },
            },
        })

        if (!row) return null

        return {
            playerId: row.playerId,
            gameweekId: row.gameweekId,
            minutesPlayed: row.minutesPlayed,
            goals: row.goals,
            assists: row.assists,
            cleanSheet: row.cleanSheet,
            saves: row.saves,
            penaltySaved: row.penaltySaved,
            penaltyMissed: row.penaltyMissed,
            goalsConceded: row.goalsConceded,
            yellowCards: row.yellowCards,
            redCards: row.redCards,
            ownGoals: row.ownGoals,
            totalPoints: row.totalPoints,
        }
    }

    async findPlayersByExternalIds(externalIds: number[]): Promise<PlayerLookupRow[]> {
        const players = await prisma.player.findMany({
            where: { externalId: { in: externalIds } },
            select: { id: true, externalId: true, position: true },
        })

        return players.map((p) => ({
            id: p.id,
            externalId: p.externalId,
            position: p.position as PlayerLookupRow['position'],
        }))
    }

    async upsertGameweekPoints(fantasyTeamId: string, gameweekId: string, points: number): Promise<void> {
        await prisma.gameweekPoints.upsert({
            where: {
                fantasyTeamId_gameweekId: { fantasyTeamId, gameweekId },
            },
            create: {
                fantasyTeamId,
                gameweekId,
                points,
            },
            update: {
                points,
            },
        })
    }
}

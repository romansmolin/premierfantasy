import type { Position, SquadPlayerInfo, SquadRules } from '@/entities/squad/model/rules'

import { SEASON } from '@/shared/config/league'
import { prisma } from '@/shared/lib/prisma'

import type { ISquadRepository, SquadWrite, StoredSquad } from './squad.repository.interface'

const PRICE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000

const include = { players: true } as const

const toStored = (row: {
    id: string
    userId: string
    name: string
    captainPlayerId: string
    viceCaptainPlayerId: string
    updatedAt: Date
    players: { playerId: string; slot: string; position: number; priceTenthsAtSave: number | null }[]
}): StoredSquad => ({
    ...row,
    players: row.players.map((p) => ({ ...p, slot: p.slot as 'START' | 'BENCH' })),
})

const playersData = (data: SquadWrite) => data.players.map((p) => ({ ...p }))

export class SquadRepository implements ISquadRepository {
    countByUser(userId: string): Promise<number> {
        return prisma.squad.count({ where: { userId } })
    }

    async findByUser(userId: string): Promise<StoredSquad[]> {
        const rows = await prisma.squad.findMany({
            where: { userId },
            include,
            orderBy: { updatedAt: 'desc' },
        })

        return rows.map(toStored)
    }

    async findOwned(userId: string, id: string): Promise<StoredSquad | null> {
        const row = await prisma.squad.findFirst({ where: { id, userId }, include })

        return row ? toStored(row) : null
    }

    async create(userId: string, data: SquadWrite): Promise<StoredSquad> {
        const row = await prisma.squad.create({
            data: {
                userId,
                name: data.name,
                captainPlayerId: data.captainPlayerId,
                viceCaptainPlayerId: data.viceCaptainPlayerId,
                players: { create: playersData(data) },
            },
            include,
        })

        return toStored(row)
    }

    async replace(id: string, data: SquadWrite): Promise<StoredSquad> {
        const [, row] = await prisma.$transaction([
            prisma.squadPlayer.deleteMany({ where: { squadId: id } }),
            prisma.squad.update({
                where: { id },
                data: {
                    name: data.name,
                    captainPlayerId: data.captainPlayerId,
                    viceCaptainPlayerId: data.viceCaptainPlayerId,
                    players: { create: playersData(data) },
                },
                include,
            }),
        ])

        return toStored(row)
    }

    async delete(id: string): Promise<void> {
        await prisma.squad.delete({ where: { id } })
    }

    async findPlayerInfos(ids: string[]): Promise<SquadPlayerInfo[]> {
        const players = await prisma.player.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                position: true,
                teamId: true,
                fplMap: { select: { fplId: true } },
                seasonPrices: {
                    where: {
                        seasonYear: SEASON,
                        priceSource: 'FPL',
                        updatedAt: { gte: new Date(Date.now() - PRICE_MAX_AGE_MS) },
                    },
                    select: { currentPrice: true },
                },
            },
        })
        const fplIds = players.flatMap((p) => (p.fplMap ? [p.fplMap.fplId] : []))
        const statuses = await prisma.fplPlayerStatus.findMany({ where: { fplId: { in: fplIds } } })
        const clubByFpl = new Map(statuses.map((s) => [s.fplId, s.teamId]))

        return players.map((p) => ({
            playerId: p.id,
            position: p.position as Position,
            clubId: (p.fplMap ? clubByFpl.get(p.fplMap.fplId) : null) ?? p.teamId,
            priceTenths: p.seasonPrices[0] ? Math.round(p.seasonPrices[0].currentPrice * 10) : null,
        }))
    }

    async findRules(): Promise<SquadRules | null> {
        const row = await prisma.fplGameSettings.findUnique({ where: { seasonYear: SEASON } })

        if (!row) return null

        const positions = row.positions as {
            position: Position
            squadSelect: number
            minPlay: number
            maxPlay: number
        }[]

        return {
            squadSize: row.squadSize,
            startingSize: row.startingSize,
            budgetTenths: row.budgetTenths,
            teamLimit: row.teamLimit,
            positions: Object.fromEntries(
                positions.map((p) => [
                    p.position,
                    { squadSelect: p.squadSelect, minPlay: p.minPlay, maxPlay: p.maxPlay },
                ]),
            ) as SquadRules['positions'],
        }
    }
}

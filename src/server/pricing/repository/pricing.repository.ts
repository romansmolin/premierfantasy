import { prisma } from '@/shared/lib/prisma'

import type {
    IPriceLookup,
    IPricingRepository,
    IPricingRow,
    IUpsertPriceInput,
} from './pricing.repository.interface'

export class PricingRepository implements IPricingRepository {
    async findBySeasonYear(seasonYear: number): Promise<IPricingRow[]> {
        const rows = await prisma.playerSeasonPrice.findMany({
            where: { seasonYear },
            select: {
                currentPrice: true,
                player: { select: { externalId: true } },
            },
        })

        return rows.map((r) => ({ externalId: r.player.externalId, currentPrice: r.currentPrice }))
    }

    async findManyByPlayerIds(playerIds: string[], seasonYear: number): Promise<IPriceLookup[]> {
        if (playerIds.length === 0) return []

        const rows = await prisma.playerSeasonPrice.findMany({
            where: { seasonYear, playerId: { in: playerIds } },
            select: { playerId: true, currentPrice: true },
        })

        return rows
    }

    async upsertMany(rows: IUpsertPriceInput[]): Promise<{ updated: number; inserted: number }> {
        let updated = 0
        let inserted = 0

        await prisma.$transaction(
            rows.map((row) => {
                return prisma.playerSeasonPrice.upsert({
                    where: {
                        playerId_seasonYear: {
                            playerId: row.playerId,
                            seasonYear: row.seasonYear,
                        },
                    },
                    create: {
                        playerId: row.playerId,
                        seasonYear: row.seasonYear,
                        basePrice: row.basePrice,
                        currentPrice: row.currentPrice,
                        priceSource: row.priceSource,
                    },
                    update: {
                        currentPrice: row.currentPrice,
                        priceSource: row.priceSource,
                    },
                })
            }),
        )

        const existing = await prisma.playerSeasonPrice.findMany({
            where: {
                seasonYear: rows[0]?.seasonYear,
                playerId: { in: rows.map((r) => r.playerId) },
            },
            select: { createdAt: true, updatedAt: true },
        })

        for (const row of existing) {
            if (row.createdAt.getTime() === row.updatedAt.getTime()) inserted++
            else updated++
        }

        return { updated, inserted }
    }

    async findPlayerIdsByExternalIds(externalIds: number[]): Promise<Map<number, string>> {
        if (externalIds.length === 0) return new Map()

        const players = await prisma.player.findMany({
            where: { externalId: { in: externalIds } },
            select: { id: true, externalId: true },
        })

        return new Map(players.map((p) => [p.externalId, p.id]))
    }
}

/**
 * One-shot backfill: write a PlayerSeasonPrice row for every Player using the legacy
 * deterministic-hash price function. Idempotent — re-running it does nothing because
 * upsert with `priceSource = 'BACKFILL_HASH'` will not overwrite manually-set prices
 * (we only insert when the row doesn't exist).
 *
 * Run with: npx tsx scripts/backfill-player-prices-pl-2025.ts
 */
import { generatePlayerPrice } from '../src/entities/players/model/player-price'
import { prisma } from '../src/shared/lib/prisma'

const SEASON_YEAR = 2025

async function main() {
    const players = await prisma.player.findMany({
        select: { id: true, externalId: true, position: true },
    })

    console.warn(`Found ${players.length} players. Backfilling PL ${SEASON_YEAR} prices…`)

    let inserted = 0
    let skipped = 0

    for (const player of players) {
        const price = generatePlayerPrice(player.externalId, player.position)

        const existing = await prisma.playerSeasonPrice.findUnique({
            where: {
                playerId_seasonYear: {
                    playerId: player.id,
                    seasonYear: SEASON_YEAR,
                },
            },
            select: { id: true },
        })

        if (existing) {
            skipped++
            continue
        }

        await prisma.playerSeasonPrice.create({
            data: {
                playerId: player.id,
                seasonYear: SEASON_YEAR,
                basePrice: price,
                currentPrice: price,
                priceSource: 'BACKFILL_HASH',
            },
        })
        inserted++
    }

    console.warn(`Backfill complete: inserted=${inserted}, skipped=${skipped}`)
    await prisma.$disconnect()
}

main().catch((error) => {
    console.error('Backfill failed:', error)
    process.exit(1)
})

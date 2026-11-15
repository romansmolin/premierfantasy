/**
 * One-off repair: AUTO FPL mappings that point to idle players (no match statistics) are removed together
 * with their FPL prices, so the next `npm run sync -- fpl-bootstrap` maps them again, now preferring active
 * players over idle legacy duplicates. MANUAL mappings are never touched.
 *
 * Usage: npx tsx -r dotenv/config scripts/fix-idle-fpl-mappings.ts
 */
import { SEASON } from '../src/shared/config/league'
import { prisma } from '../src/shared/lib/prisma'

async function main() {
    const idle = await prisma.fplPlayerMap.findMany({
        where: { method: 'AUTO', player: { matchStats: { none: {} } } },
        select: { id: true, playerId: true },
    })
    const playerIds = idle.map((m) => m.playerId)
    const prices = await prisma.playerSeasonPrice.deleteMany({
        where: { playerId: { in: playerIds }, seasonYear: SEASON, priceSource: 'FPL' },
    })
    const maps = await prisma.fplPlayerMap.deleteMany({ where: { id: { in: idle.map((m) => m.id) } } })

    process.stdout.write(`removed ${maps.count} idle AUTO mappings and ${prices.count} FPL prices\n`)
}

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error)
        process.exit(1)
    })
    .finally(() => process.exit(0))

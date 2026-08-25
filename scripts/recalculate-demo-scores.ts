/**
 * Development runner for the demo score recalculation cron.
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/recalculate-demo-scores.ts
 *   npx tsx -r dotenv/config scripts/recalculate-demo-scores.ts --competition <uuid>
 */
import { DemoRepository } from '../src/server/demo/repository/demo.repository'
import { DemoCompetitionService } from '../src/server/demo/service/demo-competition.service'
import { prisma } from '../src/shared/lib/prisma'

async function main() {
    const argv = process.argv.slice(2)
    const flagIndex = argv.indexOf('--competition')
    const competitionId = flagIndex >= 0 ? argv[flagIndex + 1] : null

    const service = new DemoCompetitionService(new DemoRepository())

    const result = competitionId
        ? await service.recalculateDemoScores(competitionId)
        : await service.recalculateAllDemoScores()

    console.warn(JSON.stringify(result, null, 2))

    await prisma.$disconnect()
}

main().catch(async (error) => {
    console.error('Recalculation failed:', error)
    await prisma.$disconnect()
    process.exit(1)
})

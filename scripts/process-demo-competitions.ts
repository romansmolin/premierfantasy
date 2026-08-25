/**
 * Development runner for the demo-competition cron logic: seeds under-filled
 * competitions, persists demo gameweek scores, finalizes finished competitions.
 * Exactly what /api/cron/competitions does on Vercel, minus the HTTP layer.
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/process-demo-competitions.ts
 *   npx tsx -r dotenv/config scripts/process-demo-competitions.ts --competition <uuid>
 */
import { DemoRepository } from '../src/server/demo/repository/demo.repository'
import { DemoCompetitionService } from '../src/server/demo/service/demo-competition.service'
import { prisma } from '../src/shared/lib/prisma'

async function main() {
    const argv = process.argv.slice(2)
    const flagIndex = argv.indexOf('--competition')
    const competitionId = flagIndex >= 0 ? argv[flagIndex + 1] : null

    const service = new DemoCompetitionService(new DemoRepository())

    if (competitionId) {
        const seeded = await service.ensureDemoParticipants(competitionId)
        const scored = await service.updateDemoScores(competitionId)

        console.warn(JSON.stringify({ seeded, scored }, null, 2))
    } else {
        const result = await service.processCompetitions()

        console.warn(JSON.stringify(result, null, 2))
    }

    await prisma.$disconnect()
}

main().catch(async (error) => {
    console.error('Demo processing failed:', error)
    await prisma.$disconnect()
    process.exit(1)
})

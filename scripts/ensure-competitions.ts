/**
 * Run the multi-league auto-competition generator once against the dev DB.
 * Same logic as the cron pipeline, instantiated narrowly to avoid pulling
 * `server-only` modules (AI/HTTP clients) that fail in a Node CLI context.
 *
 * Usage: npx tsx -r dotenv/config scripts/ensure-competitions.ts
 */
import { CompetitionRepository } from '../src/server/competition/repository/competition.repository'
import { CompetitionService } from '../src/server/competition/service/competition.service'
import { LeagueRepository } from '../src/server/league/repository/league.repository'
import { prisma } from '../src/shared/lib/prisma'

async function main() {
    const competitionRepository = new CompetitionRepository()
    const leagueRepository = new LeagueRepository()
    const service = new CompetitionService(
        competitionRepository,
        undefined,
        undefined,
        undefined,
        leagueRepository,
    )

    const result = await service.ensureCompetitionsForActiveSeasons()
    console.warn(
        `Multi-league competitions: created=${result.created}, reactivated=${result.reactivated}, skipped=${result.skipped}`,
    )
    await prisma.$disconnect()
}

main().catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
})

/**
 * One-shot repair: bring the dev DB into a state where Premier League has
 * a joinable competition, and multi-league competitions are recovered after
 * the cascading-completed bug.
 *
 * Behavior:
 *   1. For Premier League: ensure the GW range covering "today" (or the
 *      latest unfinished GW range) is `active` with a future joinDeadline.
 *      If the underlying gameweeks are all finished but the season is still
 *      in progress, flip the latest GW range's gameweeks to !isFinished so
 *      transitionCompetitions doesn't immediately mark it completed again.
 *   2. For every other in-progress league: invoke
 *      ensureCompetitionsForActiveSeasons (which is now self-healing).
 *
 * Usage: npx tsx -r dotenv/config scripts/repair-competitions.ts
 */
import { CompetitionRepository } from '../src/server/competition/repository/competition.repository'
import { CompetitionService } from '../src/server/competition/service/competition.service'
import { LeagueRepository } from '../src/server/league/repository/league.repository'
import { LEAGUE_ID } from '../src/shared/config/league'
import { prisma } from '../src/shared/lib/prisma'

const MS_PER_DAY = 24 * 60 * 60 * 1000

async function repairPremierLeague() {
    const now = new Date()

    const plLeague = await prisma.league.findFirst({
        where: { externalId: LEAGUE_ID },
        include: { seasons: { where: { isCurrent: true } } },
    })

    if (!plLeague || plLeague.seasons.length === 0) {
        console.warn('No Premier League current season found — skipping PL repair')

        return
    }

    const season = plLeague.seasons[0]

    // Find the PL competition that would naturally cover "today" — the one
    // whose gameweek range overlaps the current week, OR the latest one.
    const plComps = await prisma.competition.findMany({
        where: { leagueSeasonId: season.id, visibility: 'PUBLIC' },
        orderBy: { startGameweek: 'asc' },
    })

    if (plComps.length === 0) {
        console.warn('No Premier League competitions found — run generateRollingCompetitions first')

        return
    }

    // Pick the competition that covers "today": prefer the one whose
    // start GW startDate is <= now <= end GW endDate; fall back to the latest.
    const gameweeks = await prisma.gameweek.findMany({
        orderBy: { number: 'asc' },
    })
    const gwByNumber = new Map(gameweeks.map((g) => [g.number, g]))

    let targetComp = plComps.find((c) => {
        const startGw = gwByNumber.get(c.startGameweek)
        const endGw = gwByNumber.get(c.endGameweek)

        if (!startGw || !endGw) return false

        return startGw.startDate <= now && endGw.endDate >= now
    })

    // If today is past every gameweek (data drift), pick the latest comp.
    if (!targetComp) {
        targetComp = plComps[plComps.length - 1]
    }

    console.warn(`PL target comp: ${targetComp.name} (${targetComp.id}) status=${targetComp.status}`)

    // Ensure the underlying gameweeks aren't all marked finished while the
    // season is still in progress — otherwise transitionCompetitions will
    // immediately re-complete this comp.
    const compGws = gameweeks.filter(
        (g) => g.number >= targetComp.startGameweek && g.number <= targetComp.endGameweek,
    )
    const allFinished = compGws.every((g) => g.isFinished)
    const seasonInProgress = season.startDate <= now && season.endDate >= now

    if (allFinished && seasonInProgress) {
        console.warn(
            `  Flipping GW${targetComp.startGameweek}-${targetComp.endGameweek} isFinished=false (season still in progress)`,
        )
        await prisma.gameweek.updateMany({
            where: {
                number: { gte: targetComp.startGameweek, lte: targetComp.endGameweek },
            },
            data: { isFinished: false },
        })

        // Activate the gameweek that contains today, or the first one in range.
        const containingGw = compGws.find((g) => g.startDate <= now && g.endDate >= now) ?? compGws[0]

        await prisma.gameweek.updateMany({ data: { isActive: false } })
        await prisma.gameweek.update({ where: { id: containingGw.id }, data: { isActive: true } })
        console.warn(`  Set GW${containingGw.number} as active gameweek`)
    }

    const futureJoinDeadline = new Date(now.getTime() + 7 * MS_PER_DAY)

    await prisma.competition.update({
        where: { id: targetComp.id },
        data: { status: 'active', joinDeadline: futureJoinDeadline },
    })
    console.warn(`  Set ${targetComp.name} to active with joinDeadline ${futureJoinDeadline.toISOString()}`)

    // Make sure no OTHER PL competition is left dangling as active.
    const otherActive = await prisma.competition.updateMany({
        where: {
            leagueSeasonId: season.id,
            status: 'active',
            id: { not: targetComp.id },
        },
        data: { status: 'completed' },
    })

    if (otherActive.count > 0) {
        console.warn(`  Marked ${otherActive.count} stale active PL comp(s) completed`)
    }
}

async function main() {
    await repairPremierLeague()

    const competitionRepository = new CompetitionRepository()
    const leagueRepository = new LeagueRepository()
    const service = new CompetitionService(
        competitionRepository,
        undefined,
        undefined,
        undefined,
        leagueRepository,
    )

    const ensured = await service.ensureCompetitionsForActiveSeasons()

    console.warn(
        `Multi-league: created=${ensured.created}, reactivated=${ensured.reactivated}, skipped=${ensured.skipped}`,
    )

    await prisma.$disconnect()
}

main().catch((error) => {
    console.error('Repair failed:', error)
    process.exit(1)
})

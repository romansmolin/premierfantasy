/**
 * Seed fictional competitors into league competitions so standings look alive
 * before real users arrive.
 *
 * Demo managers are User rows flagged `isDemo` with a synthetic @demo.invalid
 * address and **no Account row**, so Better Auth has no credential to match —
 * they can never sign in. Their squads and memberships otherwise use exactly the
 * same tables as real managers, so they score and rank normally.
 *
 * Squads are drawn from the clubs registered against the competition's league season
 * (`LeagueSeasonTeam`, populated by scripts/sync-league-squads.ts), so a Serie A demo
 * team fields Serie A players.
 *
 * Idempotent: users are upserted by email, memberships by (user, season), teams
 * by (user, competition). Re-running tops a league up to `--count` and leaves
 * existing demo squads untouched.
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/seed-demo-competitors.ts                        # all live leagues, 5 each
 *   npx tsx -r dotenv/config scripts/seed-demo-competitors.ts --league 39 --count 8
 *   npx tsx -r dotenv/config scripts/seed-demo-competitors.ts --competition <uuid>
 *   npx tsx -r dotenv/config scripts/seed-demo-competitors.ts --teams 33,40,50       # override the player pool
 */
import { generatePlayerPrice } from '../src/entities/players/model/player-price'
import { BUDGET_TOTAL } from '../src/entities/players/model/player-selection.validation'
import {
    buildDemoSquad,
    demoEmail,
    pickDemoManagers,
    type DemoPoolPlayer,
} from '../src/server/demo/lib/demo-roster'
import { SEASON } from '../src/shared/config/league'
import { prisma } from '../src/shared/lib/prisma'

import type { PlayerPosition } from '../src/entities/players/model/player.types'

const DEFAULT_COUNT = 5

interface Options {
    count: number
    leagueExternalIds: number[]
    competitionIds: string[]
    teamExternalIds: number[]
    seasonYear: number
}

const numberList = (raw: string | undefined): number[] =>
    (raw ?? '')
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)

function parseArgs(): Options {
    const argv = process.argv.slice(2)

    const flag = (name: string): string | undefined => {
        const index = argv.indexOf(`--${name}`)

        return index >= 0 ? argv[index + 1] : undefined
    }

    return {
        count: Number(flag('count') ?? DEFAULT_COUNT),
        leagueExternalIds: numberList(flag('league')),
        competitionIds: (flag('competition') ?? '')
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
        teamExternalIds: numberList(flag('teams')),
        seasonYear: Number(flag('season') ?? SEASON),
    }
}

function assertNotProduction() {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
        throw new Error(
            'Refusing to seed demo competitors in production. Set ALLOW_DEMO_SEED=true to override.',
        )
    }
}

/** Competitions that are still worth populating: anything not finished. */
async function resolveCompetitions(options: Options) {
    if (options.competitionIds.length > 0) {
        return prisma.competition.findMany({
            where: { id: { in: options.competitionIds } },
            include: { leagueSeason: { include: { league: true } } },
        })
    }

    return prisma.competition.findMany({
        where: {
            status: { in: ['active', 'upcoming'] },
            leagueSeason: {
                is: {
                    league: {
                        is: {
                            isActive: true,
                            ...(options.leagueExternalIds.length > 0
                                ? { externalId: { in: options.leagueExternalIds } }
                                : {}),
                        },
                    },
                },
            },
        },
        orderBy: [{ status: 'asc' }, { startGameweek: 'asc' }],
        include: { leagueSeason: { include: { league: true } } },
    })
}

async function loadPlayerPool(teamExternalIds: number[], seasonYear: number): Promise<DemoPoolPlayer[]> {
    const players = await prisma.player.findMany({
        where: teamExternalIds.length > 0 ? { team: { is: { externalId: { in: teamExternalIds } } } } : {},
        select: {
            id: true,
            externalId: true,
            name: true,
            position: true,
            team: { select: { externalId: true } },
            seasonPrices: {
                where: { seasonYear },
                select: { currentPrice: true },
            },
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

/**
 * The clubs registered against a league season, populated by the squad sync.
 * Empty means the sync has not run for that season yet.
 */
async function leagueSeasonTeamExternalIds(leagueSeasonId: string): Promise<number[]> {
    const links = await prisma.leagueSeasonTeam.findMany({
        where: { leagueSeasonId },
        select: { team: { select: { externalId: true } } },
    })

    return links.map((link) => link.team.externalId)
}

/** Deterministic per (competition, manager) so re-runs regenerate identical squads. */
const seedFor = (competitionId: string, slug: string): number => {
    let hash = 2166136261

    for (const char of `${competitionId}:${slug}`) {
        hash ^= char.charCodeAt(0)
        hash = Math.imul(hash, 16777619)
    }

    return hash >>> 0
}

async function main() {
    assertNotProduction()

    const options = parseArgs()

    if (!Number.isFinite(options.count) || options.count < 0) {
        throw new Error(`Invalid --count: ${options.count}`)
    }

    const managers = pickDemoManagers(options.count)

    if (managers.length < options.count) {
        console.warn(
            `Only ${managers.length} demo profiles exist — seeding ${managers.length} instead of ${options.count}.`,
        )
    }

    const competitions = await resolveCompetitions(options)

    if (competitions.length === 0) {
        console.warn('No matching competitions found. Nothing to seed.')
        await prisma.$disconnect()

        return
    }

    console.warn(`Seeding ${managers.length} demo competitors into ${competitions.length} competition(s)…`)

    let teamsCreated = 0
    let teamsSkipped = 0
    let squadsFilled = 0
    let squadsFailed = 0

    // One pool per league season — clubs differ per league, and building it once
    // per competition would re-query the same rows for every round of the season.
    const poolsBySeason = new Map<string, DemoPoolPlayer[]>()

    for (const competition of competitions) {
        const leagueSeason = competition.leagueSeason
        const poolKey = leagueSeason?.id ?? '__unscoped__'

        let pool = poolsBySeason.get(poolKey)

        if (!pool) {
            let teamExternalIds = options.teamExternalIds

            if (teamExternalIds.length === 0 && leagueSeason) {
                teamExternalIds = await leagueSeasonTeamExternalIds(leagueSeason.id)

                if (teamExternalIds.length === 0) {
                    console.warn(
                        `  ${competition.name}: no clubs linked to this league season — falling back to every local player. Run the squad sync to scope it.`,
                    )
                }
            }

            pool = await loadPlayerPool(teamExternalIds, options.seasonYear)
            poolsBySeason.set(poolKey, pool)
        }

        if (pool.length === 0) {
            console.warn(
                `  ${competition.name}: no players available for this league — skipping. Run the squad sync first.`,
            )
            continue
        }

        for (const manager of managers) {
            const user = await prisma.user.upsert({
                where: { email: demoEmail(manager.slug) },
                create: {
                    email: demoEmail(manager.slug),
                    name: manager.managerName,
                    emailVerified: false,
                    isDemo: true,
                },
                update: { name: manager.managerName, isDemo: true },
            })

            if (leagueSeason) {
                await prisma.leagueMembership.upsert({
                    where: {
                        userId_leagueSeasonId: { userId: user.id, leagueSeasonId: leagueSeason.id },
                    },
                    create: {
                        userId: user.id,
                        leagueId: leagueSeason.leagueId,
                        leagueSeasonId: leagueSeason.id,
                        isDemo: true,
                    },
                    update: { isDemo: true },
                })
            }

            const existingTeam = await prisma.fantasyTeam.findUnique({
                where: { userId_competitionId: { userId: user.id, competitionId: competition.id } },
                include: { _count: { select: { players: true } } },
            })

            if (existingTeam && existingTeam._count.players > 0) {
                teamsSkipped++
                continue
            }

            const squad = buildDemoSquad(pool, seedFor(competition.id, manager.slug))

            if (!squad) {
                squadsFailed++
                console.warn(
                    `  Could not build a valid squad for ${manager.teamName} in ${competition.name} — pool too thin.`,
                )
                continue
            }

            const budgetUsed = squad.reduce((sum, p) => sum + p.price, 0)

            const team =
                existingTeam ??
                (await prisma.fantasyTeam.create({
                    data: {
                        userId: user.id,
                        competitionId: competition.id,
                        name: manager.teamName,
                        budgetLeft: Math.round((BUDGET_TOTAL - budgetUsed) * 10) / 10,
                        isDemo: true,
                    },
                }))

            if (!existingTeam) teamsCreated++

            await prisma.fantasyTeamPlayer.deleteMany({ where: { fantasyTeamId: team.id } })
            await prisma.fantasyTeamPlayer.createMany({
                data: squad.map((player) => ({
                    fantasyTeamId: team.id,
                    playerId: player.id,
                    position: player.position,
                    purchasePrice: player.price,
                })),
            })
            await prisma.fantasyTeam.update({
                where: { id: team.id },
                data: {
                    isDemo: true,
                    name: manager.teamName,
                    budgetLeft: Math.round((BUDGET_TOTAL - budgetUsed) * 10) / 10,
                },
            })

            squadsFilled++
        }

        console.warn(`  ${competition.name}: done (pool ${pool.length} players)`)
    }

    console.warn(
        `Demo seed complete: teamsCreated=${teamsCreated}, squadsFilled=${squadsFilled}, alreadySeeded=${teamsSkipped}, failed=${squadsFailed}`,
    )

    await prisma.$disconnect()
}

main().catch(async (error) => {
    console.error('Demo seed failed:', error)
    await prisma.$disconnect()
    process.exit(1)
})

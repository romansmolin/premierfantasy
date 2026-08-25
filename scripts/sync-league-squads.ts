/**
 * Import teams + squads from API-Football into the local DB for one or more leagues.
 *
 * The team builder reads its player pool live from API-Football, but fantasy squads
 * reference local `Player` rows. Anything that writes a squad server-side (the demo
 * competitor seed, scoring) needs those rows to exist first.
 *
 * Also records which clubs belong to each league season (`LeagueSeasonTeam`), so a
 * league-correct player pool can be resolved locally without calling the API again.
 *
 * Idempotent — upserts on `external_id`.
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/sync-league-squads.ts                 # default leagues
 *   npx tsx -r dotenv/config scripts/sync-league-squads.ts 140 78 --season 2026
 */
import { mapApiPosition } from '../src/entities/players/model/player-position.map'
import { SEASON } from '../src/shared/config/league'
import { prisma } from '../src/shared/lib/prisma'

import type { PlayerPosition } from '../src/entities/players/model/player.types'

/** Leagues whose 2026/27 join window is currently open. */
const DEFAULT_LEAGUE_IDS = [39, 140, 78, 135, 61, 88, 94, 262]

const BASE_URL = process.env.FOOTBAL_API_BASE_URL
const API_KEY = process.env.FOOTBAL_API_KEY

interface ApiTeam {
    team: { id: number; name: string; code: string | null; logo: string | null }
}

interface ApiSquadPlayer {
    id: number
    name: string
    position: string
}

interface ApiSquad {
    team: { id: number }
    players: ApiSquadPlayer[]
}

const parseArgs = () => {
    const argv = process.argv.slice(2)
    const seasonIndex = argv.indexOf('--season')
    const season = seasonIndex >= 0 ? Number(argv[seasonIndex + 1]) : SEASON
    const leagueIds = argv
        .filter((a, i) => a !== '--season' && i !== seasonIndex + 1)
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0)

    return {
        season,
        leagueIds: leagueIds.length > 0 ? leagueIds : DEFAULT_LEAGUE_IDS,
    }
}

async function apiGet<T>(path: string, params: Record<string, string | number>): Promise<T[]> {
    const url = new URL(`${BASE_URL}${path}`)

    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value))
    }

    const response = await fetch(url, { headers: { 'x-apisports-key': API_KEY as string } })

    if (!response.ok) {
        throw new Error(`${path} failed: ${response.status} ${response.statusText}`)
    }

    const body = (await response.json()) as { errors?: unknown; response?: T[] }
    const errors = body.errors

    if (errors && (Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0)) {
        throw new Error(`${path} returned errors: ${JSON.stringify(errors)}`)
    }

    return body.response ?? []
}

/** API-Football allows 300 requests/minute; keep a small gap between squad calls. */
const throttle = () => new Promise((resolve) => setTimeout(resolve, 220))

const safePosition = (raw: string): PlayerPosition | null => {
    try {
        return mapApiPosition(raw)
    } catch {
        return null
    }
}

async function main() {
    if (!BASE_URL || !API_KEY) {
        throw new Error('FOOTBAL_API_BASE_URL and FOOTBAL_API_KEY must be set')
    }

    const { leagueIds, season } = parseArgs()

    console.warn(`Syncing squads for leagues [${leagueIds.join(', ')}] season ${season}…`)

    let teamsUpserted = 0
    let playersUpserted = 0
    let positionsSkipped = 0
    let linksUpserted = 0

    for (const leagueId of leagueIds) {
        const apiTeams = await apiGet<ApiTeam>('/teams', { league: leagueId, season })

        console.warn(`  league ${leagueId}: ${apiTeams.length} teams`)

        // The season row the clubs get attached to. Missing means the leagues
        // catalogue has not been seeded for this year yet — players still import,
        // only the league↔club links are skipped.
        const league = await prisma.league.findUnique({ where: { externalId: leagueId } })
        const leagueSeason = league
            ? await prisma.leagueSeason.findUnique({
                  where: { leagueId_year: { leagueId: league.id, year: season } },
              })
            : null

        if (!leagueSeason) {
            console.warn(`  league ${leagueId}: no LeagueSeason for ${season} — skipping league↔club links`)
        }

        for (const { team } of apiTeams) {
            const localTeam = await prisma.team.upsert({
                where: { externalId: team.id },
                create: {
                    externalId: team.id,
                    name: team.name,
                    shortName: team.code ?? team.name.slice(0, 3).toUpperCase(),
                    logo: team.logo,
                },
                update: {
                    name: team.name,
                    shortName: team.code ?? team.name.slice(0, 3).toUpperCase(),
                    logo: team.logo,
                },
            })

            teamsUpserted++

            if (leagueSeason) {
                await prisma.leagueSeasonTeam.upsert({
                    where: {
                        leagueSeasonId_teamId: {
                            leagueSeasonId: leagueSeason.id,
                            teamId: localTeam.id,
                        },
                    },
                    create: { leagueSeasonId: leagueSeason.id, teamId: localTeam.id },
                    update: {},
                })

                linksUpserted++
            }

            const squads = await apiGet<ApiSquad>('/players/squads', { team: team.id })
            const squad = squads[0]?.players ?? []

            for (const player of squad) {
                const position = safePosition(player.position)

                if (!position) {
                    positionsSkipped++
                    continue
                }

                await prisma.player.upsert({
                    where: { externalId: player.id },
                    create: {
                        externalId: player.id,
                        name: player.name,
                        position,
                        team: { connect: { externalId: team.id } },
                    },
                    update: {
                        name: player.name,
                        position,
                        team: { connect: { externalId: team.id } },
                    },
                })

                playersUpserted++
            }

            await throttle()
        }
    }

    console.warn(
        `Sync complete: teams=${teamsUpserted}, leagueLinks=${linksUpserted}, players=${playersUpserted}, unknownPositions=${positionsSkipped}`,
    )

    await prisma.$disconnect()
}

main().catch(async (error) => {
    console.error('Sync failed:', error)
    await prisma.$disconnect()
    process.exit(1)
})

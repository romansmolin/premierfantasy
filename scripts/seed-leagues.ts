/**
 * Seed the leagues catalogue + a current LeagueSeason for each.
 *
 * Idempotent — re-running upserts on `external_id` and `(league_id, year)`.
 *
 * Run with: npx tsx -r dotenv/config scripts/seed-leagues.ts
 */
import { prisma } from '../src/shared/lib/prisma'

interface SeasonSeed {
    year: number
    startDate: string
    endDate: string
    /** Exactly one season per league may be `true`. */
    isCurrent: boolean
}

interface LeagueSeed {
    externalId: number
    name: string
    country: string
    type: 'League' | 'Cup' | 'Tournament'
    seasonStartMonth: number
    logo?: string
    seasons: SeasonSeed[]
}

const apiSportsLogo = (id: number) => `https://media.api-sports.io/football/leagues/${id}.png`

const LEAGUES: LeagueSeed[] = [
    // ── European top-5 leagues (Aug → May) ─────────────────────────────────────
    {
        externalId: 39,
        name: 'Premier League',
        country: 'England',
        type: 'League',
        seasonStartMonth: 8,
        logo: apiSportsLogo(39),
        seasons: [
            {
                year: 2025,
                startDate: '2025-08-15',
                endDate: '2026-05-24',
                isCurrent: false,
            },
            {
                year: 2026,
                startDate: '2026-08-15',
                endDate: '2027-05-23',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 140,
        name: 'La Liga',
        country: 'Spain',
        type: 'League',
        seasonStartMonth: 8,
        logo: apiSportsLogo(140),
        seasons: [
            {
                year: 2025,
                startDate: '2025-08-15',
                endDate: '2026-05-24',
                isCurrent: false,
            },
            {
                year: 2026,
                startDate: '2026-08-15',
                endDate: '2027-05-23',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 78,
        name: 'Bundesliga',
        country: 'Germany',
        type: 'League',
        seasonStartMonth: 8,
        logo: apiSportsLogo(78),
        seasons: [
            {
                year: 2025,
                startDate: '2025-08-22',
                endDate: '2026-05-17',
                isCurrent: false,
            },
            {
                year: 2026,
                startDate: '2026-08-21',
                endDate: '2027-05-15',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 135,
        name: 'Serie A',
        country: 'Italy',
        type: 'League',
        seasonStartMonth: 8,
        logo: apiSportsLogo(135),
        seasons: [
            {
                year: 2025,
                startDate: '2025-08-23',
                endDate: '2026-05-24',
                isCurrent: false,
            },
            {
                year: 2026,
                startDate: '2026-08-22',
                endDate: '2027-05-23',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 61,
        name: 'Ligue 1',
        country: 'France',
        type: 'League',
        seasonStartMonth: 8,
        logo: apiSportsLogo(61),
        seasons: [
            {
                year: 2025,
                startDate: '2025-08-15',
                endDate: '2026-05-23',
                isCurrent: false,
            },
            {
                year: 2026,
                startDate: '2026-08-14',
                endDate: '2027-05-22',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 88,
        name: 'Eredivisie',
        country: 'Netherlands',
        type: 'League',
        seasonStartMonth: 8,
        logo: apiSportsLogo(88),
        seasons: [
            {
                year: 2025,
                startDate: '2025-08-08',
                endDate: '2026-05-17',
                isCurrent: false,
            },
            {
                year: 2026,
                startDate: '2026-08-07',
                endDate: '2027-05-16',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 94,
        name: 'Primeira Liga',
        country: 'Portugal',
        type: 'League',
        seasonStartMonth: 8,
        logo: apiSportsLogo(94),
        seasons: [
            {
                year: 2025,
                startDate: '2025-08-08',
                endDate: '2026-05-17',
                isCurrent: false,
            },
            {
                year: 2026,
                startDate: '2026-08-07',
                endDate: '2027-05-16',
                isCurrent: true,
            },
        ],
    },
    // ── Counter-seasonal leagues (Feb → Dec) ──────────────────────────────────
    {
        externalId: 253,
        name: 'Major League Soccer',
        country: 'USA',
        type: 'League',
        seasonStartMonth: 2,
        logo: apiSportsLogo(253),
        seasons: [
            {
                year: 2026,
                startDate: '2026-02-21',
                endDate: '2026-12-06',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 71,
        name: 'Brasileirão Série A',
        country: 'Brazil',
        type: 'League',
        seasonStartMonth: 4,
        logo: apiSportsLogo(71),
        seasons: [
            {
                year: 2026,
                startDate: '2026-04-11',
                endDate: '2026-12-13',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 128,
        name: 'Liga Profesional Argentina',
        country: 'Argentina',
        type: 'League',
        seasonStartMonth: 1,
        logo: apiSportsLogo(128),
        seasons: [
            {
                year: 2026,
                startDate: '2026-01-23',
                endDate: '2026-12-13',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 98,
        name: 'J1 League',
        country: 'Japan',
        type: 'League',
        seasonStartMonth: 2,
        logo: apiSportsLogo(98),
        seasons: [
            {
                year: 2026,
                startDate: '2026-02-21',
                endDate: '2026-12-05',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 292,
        name: 'K League 1',
        country: 'South Korea',
        type: 'League',
        seasonStartMonth: 2,
        logo: apiSportsLogo(292),
        seasons: [
            {
                year: 2026,
                startDate: '2026-02-28',
                endDate: '2026-11-29',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 262,
        name: 'Liga MX',
        country: 'Mexico',
        type: 'League',
        seasonStartMonth: 7,
        logo: apiSportsLogo(262),
        seasons: [
            {
                year: 2025,
                startDate: '2025-07-11',
                endDate: '2026-05-26',
                isCurrent: false,
            },
            {
                year: 2026,
                startDate: '2026-07-03',
                endDate: '2027-05-24',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 103,
        name: 'Eliteserien',
        country: 'Norway',
        type: 'League',
        seasonStartMonth: 4,
        logo: apiSportsLogo(103),
        seasons: [
            {
                year: 2026,
                startDate: '2026-04-04',
                endDate: '2026-12-06',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 113,
        name: 'Allsvenskan',
        country: 'Sweden',
        type: 'League',
        seasonStartMonth: 4,
        logo: apiSportsLogo(113),
        seasons: [
            {
                year: 2026,
                startDate: '2026-03-28',
                endDate: '2026-11-08',
                isCurrent: true,
            },
        ],
    },
    // ── Continental club championships ────────────────────────────────────────
    {
        externalId: 2,
        name: 'UEFA Champions League',
        country: 'Europe',
        type: 'Cup',
        seasonStartMonth: 9,
        logo: apiSportsLogo(2),
        seasons: [
            {
                year: 2025,
                startDate: '2025-09-16',
                endDate: '2026-05-30',
                isCurrent: false,
            },
            {
                year: 2026,
                startDate: '2026-09-15',
                endDate: '2027-05-29',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 3,
        name: 'UEFA Europa League',
        country: 'Europe',
        type: 'Cup',
        seasonStartMonth: 9,
        logo: apiSportsLogo(3),
        seasons: [
            {
                year: 2025,
                startDate: '2025-09-24',
                endDate: '2026-05-27',
                isCurrent: false,
            },
            {
                year: 2026,
                startDate: '2026-09-23',
                endDate: '2027-05-26',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 848,
        name: 'UEFA Europa Conference League',
        country: 'Europe',
        type: 'Cup',
        seasonStartMonth: 9,
        logo: apiSportsLogo(848),
        seasons: [
            {
                year: 2025,
                startDate: '2025-10-02',
                endDate: '2026-05-28',
                isCurrent: false,
            },
            {
                year: 2026,
                startDate: '2026-10-01',
                endDate: '2027-05-27',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 13,
        name: 'Copa Libertadores',
        country: 'South America',
        type: 'Cup',
        seasonStartMonth: 2,
        logo: apiSportsLogo(13),
        seasons: [
            {
                year: 2026,
                startDate: '2026-02-04',
                endDate: '2026-11-28',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 11,
        name: 'Copa Sudamericana',
        country: 'South America',
        type: 'Cup',
        seasonStartMonth: 2,
        logo: apiSportsLogo(11),
        seasons: [
            {
                year: 2026,
                startDate: '2026-03-04',
                endDate: '2026-11-21',
                isCurrent: true,
            },
        ],
    },
    {
        externalId: 15,
        name: 'FIFA Club World Cup',
        country: 'World',
        type: 'Tournament',
        seasonStartMonth: 6,
        logo: apiSportsLogo(15),
        seasons: [
            {
                year: 2025,
                startDate: '2025-06-15',
                endDate: '2025-07-13',
                isCurrent: false,
            },
        ],
    },
    // ── International tournaments ─────────────────────────────────────────────
    {
        externalId: 1,
        name: 'FIFA World Cup',
        country: 'World',
        type: 'Tournament',
        seasonStartMonth: 6,
        logo: apiSportsLogo(1),
        seasons: [
            {
                year: 2026,
                startDate: '2026-06-11',
                endDate: '2026-07-19',
                isCurrent: false,
            },
        ],
    },
    {
        externalId: 4,
        name: 'UEFA Euros',
        country: 'Europe',
        type: 'Tournament',
        seasonStartMonth: 6,
        logo: apiSportsLogo(4),
        seasons: [
            {
                year: 2028,
                startDate: '2028-06-09',
                endDate: '2028-07-09',
                isCurrent: false,
            },
        ],
    },
    {
        externalId: 9,
        name: 'Copa América',
        country: 'South America',
        type: 'Tournament',
        seasonStartMonth: 6,
        logo: apiSportsLogo(9),
        seasons: [
            {
                year: 2028,
                startDate: '2028-06-10',
                endDate: '2028-07-09',
                isCurrent: false,
            },
        ],
    },
    {
        externalId: 6,
        name: 'Africa Cup of Nations',
        country: 'Africa',
        type: 'Tournament',
        seasonStartMonth: 1,
        logo: apiSportsLogo(6),
        seasons: [
            {
                year: 2027,
                startDate: '2027-01-15',
                endDate: '2027-02-13',
                isCurrent: false,
            },
        ],
    },
    {
        externalId: 7,
        name: 'AFC Asian Cup',
        country: 'Asia',
        type: 'Tournament',
        seasonStartMonth: 1,
        logo: apiSportsLogo(7),
        seasons: [
            {
                year: 2027,
                startDate: '2027-01-07',
                endDate: '2027-02-05',
                isCurrent: false,
            },
        ],
    },
]

async function main() {
    console.warn(`Seeding ${LEAGUES.length} leagues + their LeagueSeasons…`)

    let leaguesUpserted = 0
    let seasonsUpserted = 0

    for (const seed of LEAGUES) {
        const league = await prisma.league.upsert({
            where: { externalId: seed.externalId },
            create: {
                externalId: seed.externalId,
                name: seed.name,
                country: seed.country,
                type: seed.type,
                seasonStartMonth: seed.seasonStartMonth,
                logo: seed.logo ?? null,
                isActive: true,
            },
            update: {
                name: seed.name,
                country: seed.country,
                type: seed.type,
                seasonStartMonth: seed.seasonStartMonth,
                logo: seed.logo ?? null,
                isActive: true,
            },
        })

        leaguesUpserted++

        const currentCount = seed.seasons.filter((season) => season.isCurrent).length

        if (currentCount > 1) {
            throw new Error(`${seed.name}: ${currentCount} seasons flagged isCurrent, expected at most 1`)
        }

        for (const season of seed.seasons) {
            await prisma.leagueSeason.upsert({
                where: {
                    leagueId_year: { leagueId: league.id, year: season.year },
                },
                create: {
                    leagueId: league.id,
                    year: season.year,
                    startDate: new Date(season.startDate),
                    endDate: new Date(season.endDate),
                    isCurrent: season.isCurrent,
                },
                update: {
                    startDate: new Date(season.startDate),
                    endDate: new Date(season.endDate),
                    isCurrent: season.isCurrent,
                },
            })

            seasonsUpserted++
        }
    }

    // Link any legacy unscoped competitions to the PL season they were played in.
    const pl = await prisma.league.findUnique({ where: { externalId: 39 } })

    if (pl) {
        const plSeason = await prisma.leagueSeason.findFirst({
            where: { leagueId: pl.id },
            orderBy: { year: 'asc' },
        })

        if (plSeason) {
            const linked = await prisma.competition.updateMany({
                where: { leagueSeasonId: null },
                data: { leagueSeasonId: plSeason.id },
            })

            console.warn(`Linked ${linked.count} unscoped competitions to Premier League ${plSeason.year}`)
        }
    }

    console.warn(`Seed complete: leaguesUpserted=${leaguesUpserted}, seasonsUpserted=${seasonsUpserted}`)

    await prisma.$disconnect()
}

main().catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
})

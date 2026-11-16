import { chunk, WRITE_CHUNK_SIZE } from '@/server/sync/lib/chunk'

import { LEAGUE_ID } from '@/shared/config/league'
import { prisma } from '@/shared/lib/prisma'

import type {
    FixtureFplLink,
    FplAvailabilityRow,
    FixtureForLinking,
    FplEventPointRow,
    FplEventRow,
    FplGameSettingsRow,
    FplPlayerMatchRow,
    FplPriceRow,
    IFplRepository,
} from './fpl.repository.interface'
import type { OurPlayer, PlayerMatch } from '../lib/player-matcher'
import type { OurTeam } from '../lib/team-matcher'

const STALE_AFTER_MS = 12 * 60 * 60 * 1000

const inLeagueSeason = (seasonYear: number) => ({ year: seasonYear, league: { externalId: LEAGUE_ID } })

export class FplRepository implements IFplRepository {
    async saveEvents(events: FplEventRow[]): Promise<void> {
        await prisma.$transaction(
            events.map((event) =>
                prisma.fplEvent.upsert({
                    where: { id: event.id },
                    create: event,
                    update: {
                        name: event.name,
                        deadline: event.deadline,
                        finished: event.finished,
                        isCurrent: event.isCurrent,
                        isNext: event.isNext,
                    },
                }),
            ),
        )
    }

    async saveGameSettings(row: FplGameSettingsRow): Promise<void> {
        const { seasonYear, ...settings } = row

        await prisma.fplGameSettings.upsert({
            where: { seasonYear },
            create: { seasonYear, ...settings, fetchedAt: new Date() },
            update: { ...settings, fetchedAt: new Date() },
        })
    }

    async findLeagueTeams(seasonYear: number): Promise<OurTeam[]> {
        const rows = await prisma.leagueSeasonTeam.findMany({
            where: { leagueSeason: inLeagueSeason(seasonYear) },
            select: { team: { select: { id: true, name: true, shortName: true } } },
        })

        return rows.map((row) => row.team)
    }

    async setTeamFplIds(map: Map<number, string>): Promise<void> {
        const entries = [...map.entries()]

        await prisma.$transaction([
            // fpl_id is unique: free ids that currently sit on a different team before assigning.
            prisma.team.updateMany({
                where: {
                    fplId: { in: entries.map(([fplId]) => fplId) },
                    id: { notIn: entries.map(([, id]) => id) },
                },
                data: { fplId: null },
            }),
            ...entries.map(([fplId, teamId]) =>
                prisma.team.update({ where: { id: teamId }, data: { fplId } }),
            ),
        ])
    }

    async saveAvailability(rows: FplAvailabilityRow[]): Promise<void> {
        for (const group of chunk(rows, WRITE_CHUNK_SIZE)) {
            await prisma.$transaction(
                group.map((row) =>
                    prisma.fplPlayerStatus.upsert({
                        where: { fplId: row.fplId },
                        create: row,
                        update: {
                            teamId: row.teamId,
                            status: row.status,
                            chanceOfPlaying: row.chanceOfPlaying,
                            news: row.news,
                            penaltiesOrder: row.penaltiesOrder,
                        },
                    }),
                ),
            )
        }
    }

    async findLeaguePlayers(seasonYear: number): Promise<OurPlayer[]> {
        return prisma.player
            .findMany({
                where: { team: { leagueSeasons: { some: { leagueSeason: inLeagueSeason(seasonYear) } } } },
                select: {
                    id: true,
                    name: true,
                    position: true,
                    teamId: true,
                    _count: { select: { matchStats: true } },
                },
            })
            .then((rows) =>
                rows.map(({ _count, ...player }) => ({ ...player, active: _count.matchStats > 0 })),
            )
    }

    async loadMappingState() {
        const [maps, rejections] = await Promise.all([
            prisma.fplPlayerMap.findMany({ select: { fplId: true, playerId: true } }),
            prisma.fplPlayerMapRejection.findMany({ select: { fplId: true } }),
        ])

        return {
            mappedFplIds: new Set(maps.map((m) => m.fplId)),
            mappedPlayerIds: new Set(maps.map((m) => m.playerId)),
            rejectedFplIds: new Set(rejections.map((r) => r.fplId)),
        }
    }

    async insertAutoMappings(matches: PlayerMatch[]): Promise<number> {
        if (matches.length === 0) return 0

        const result = await prisma.fplPlayerMap.createMany({
            data: matches.map((m) => ({
                fplId: m.fplId,
                playerId: m.playerId,
                method: 'AUTO',
                confidence: m.confidence,
            })),
            skipDuplicates: true,
        })

        return result.count
    }

    async findFplPlayerMap(): Promise<Map<number, string>> {
        const maps = await prisma.fplPlayerMap.findMany({ select: { fplId: true, playerId: true } })

        return new Map(maps.map((m) => [m.fplId, m.playerId]))
    }

    async upsertFplPrices(
        seasonYear: number,
        rows: FplPriceRow[],
    ): Promise<{ inserted: number; updated: number }> {
        const existing = await prisma.playerSeasonPrice.findMany({
            where: { seasonYear, playerId: { in: rows.map((row) => row.playerId) } },
            select: { playerId: true, priceSource: true },
        })
        const sourceByPlayer = new Map(existing.map((e) => [e.playerId, e.priceSource]))

        for (const group of chunk(rows, WRITE_CHUNK_SIZE)) {
            await prisma.$transaction(
                group.map((row) =>
                    prisma.playerSeasonPrice.upsert({
                        where: { playerId_seasonYear: { playerId: row.playerId, seasonYear } },
                        create: {
                            playerId: row.playerId,
                            seasonYear,
                            basePrice: row.price,
                            currentPrice: row.price,
                            priceSource: 'FPL',
                        },
                        update: {
                            currentPrice: row.price,
                            priceSource: 'FPL',
                            updatedAt: new Date(),
                            // A placeholder row has a made-up base price: replace it the first time FPL owns the row.
                            ...(sourceByPlayer.get(row.playerId) !== 'FPL' ? { basePrice: row.price } : {}),
                        },
                    }),
                ),
            )
        }

        const updated = rows.filter((row) => sourceByPlayer.has(row.playerId)).length

        return { inserted: rows.length - updated, updated }
    }

    async deleteNonFplPrices(seasonYear: number): Promise<number> {
        const result = await prisma.playerSeasonPrice.deleteMany({
            where: { seasonYear, priceSource: { not: 'FPL' } },
        })

        return result.count
    }

    async findFixturesForLinking(seasonYear: number): Promise<FixtureForLinking[]> {
        const rows = await prisma.fixture.findMany({
            where: { leagueSeason: inLeagueSeason(seasonYear) },
            select: {
                id: true,
                kickoff: true,
                homeTeam: { select: { fplId: true } },
                awayTeam: { select: { fplId: true } },
            },
        })

        return rows.map((row) => ({
            id: row.id,
            kickoff: row.kickoff,
            homeFplTeamId: row.homeTeam.fplId,
            awayFplTeamId: row.awayTeam.fplId,
        }))
    }

    async setFixtureFplLinks(links: FixtureFplLink[]): Promise<void> {
        // fpl_fixture_id is unique: release ids that are about to move to another fixture.
        await prisma.fixture.updateMany({
            where: { fplFixtureId: { in: links.map((l) => l.fplFixtureId) } },
            data: { fplFixtureId: null, fplEvent: null },
        })

        for (const group of chunk(links, WRITE_CHUNK_SIZE)) {
            await prisma.$transaction(
                group.map((link) =>
                    prisma.fixture.update({
                        where: { id: link.fixtureId },
                        data: { fplFixtureId: link.fplFixtureId, fplEvent: link.fplEvent },
                    }),
                ),
            )
        }
    }

    async findEvents(): Promise<{ id: number; finished: boolean; isCurrent: boolean }[]> {
        return prisma.fplEvent.findMany({
            select: { id: true, finished: true, isCurrent: true },
            orderBy: { id: 'asc' },
        })
    }

    async findEventsWithPoints(): Promise<Set<number>> {
        const rows = await prisma.fplEventPoints.findMany({ distinct: ['event'], select: { event: true } })

        return new Set(rows.map((row) => row.event))
    }

    async saveEventPoints(event: number, rows: FplEventPointRow[]): Promise<void> {
        await prisma.$transaction([
            prisma.fplEventPoints.deleteMany({ where: { event } }),
            prisma.fplEventPoints.createMany({ data: rows.map((row) => ({ event, ...row })) }),
        ])
    }

    async findPlayersNeedingMatches(limit: number, now: Date): Promise<number[]> {
        const staleBefore = now.getTime() - STALE_AFTER_MS
        const [events, maps, played, stored] = await Promise.all([
            prisma.fplEvent.findMany({ select: { id: true, finished: true, isCurrent: true } }),
            prisma.fplPlayerMap.findMany({ select: { fplId: true } }),
            prisma.fplEventPoints.findMany({
                where: { minutes: { gt: 0 } },
                select: { fplPlayerId: true, event: true, minutes: true },
            }),
            prisma.fplPlayerMatch.findMany({ select: { fplPlayerId: true, event: true, updatedAt: true } }),
        ])
        const mapped = new Set(maps.map((m) => m.fplId))
        const finished = new Set(events.filter((e) => e.finished).map((e) => e.id))
        const current = events.find((e) => e.isCurrent)
        const recent = new Set(current ? [current.id, current.id - 1] : [])
        const storedKeys = new Set(stored.map((s) => `${s.fplPlayerId}:${s.event}`))
        const newest = new Map<number, number>()

        for (const s of stored) {
            newest.set(s.fplPlayerId, Math.max(newest.get(s.fplPlayerId) ?? 0, s.updatedAt.getTime()))
        }

        const missing = new Set<number>()
        const stale = new Set<number>()
        const minutes = new Map<number, number>()

        for (const row of played) {
            if (!mapped.has(row.fplPlayerId)) continue

            minutes.set(row.fplPlayerId, (minutes.get(row.fplPlayerId) ?? 0) + row.minutes)

            if (finished.has(row.event) && !storedKeys.has(`${row.fplPlayerId}:${row.event}`)) {
                missing.add(row.fplPlayerId)
            } else if (recent.has(row.event) && (newest.get(row.fplPlayerId) ?? 0) < staleBefore) {
                stale.add(row.fplPlayerId)
            }
        }

        const byMinutes = (a: number, b: number) => (minutes.get(b) ?? 0) - (minutes.get(a) ?? 0)

        return [
            ...[...missing].sort(byMinutes),
            ...[...stale].filter((id) => !missing.has(id)).sort(byMinutes),
        ].slice(0, limit)
    }

    async savePlayerMatches(rows: FplPlayerMatchRow[]): Promise<void> {
        for (const group of chunk(rows, WRITE_CHUNK_SIZE)) {
            await prisma.$transaction(
                group.map((row) =>
                    prisma.fplPlayerMatch.upsert({
                        where: {
                            fplPlayerId_fplFixtureId: {
                                fplPlayerId: row.fplPlayerId,
                                fplFixtureId: row.fplFixtureId,
                            },
                        },
                        create: row,
                        update: row,
                    }),
                ),
            )
        }
    }
}

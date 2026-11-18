import { MODEL_VERSION } from '@/server/prediction/lib/model'

import { LEAGUE_ID, SEASON } from '@/shared/config/league'
import { prisma } from '@/shared/lib/prisma'

import type {
    ClubRef,
    IStatsRepository,
    PredictionView,
    FormMatch,
    StatsFixture,
    StatsLineRow,
    StatsPlayer,
    UpcomingFixture,
} from './stats.repository.interface'
import type { Position } from '@/server/prediction/lib/scoring-rules'
import type { SeasonLine } from '@/server/scout/lib/radar'

/** A price older than this is treated as missing (the sync runs daily). */
const PRICE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000

const currentSeason = { year: SEASON, league: { externalId: LEAGUE_ID } }
/** The v2 model reads the current and the previous stored season. */
const storedSeasons = { year: { in: [SEASON, SEASON - 1] }, league: { externalId: LEAGUE_ID } }

const fixtureSelect = {
    id: true,
    kickoff: true,
    status: true,
    fplEvent: true,
    homeTeam: { select: { id: true, name: true, logo: true } },
    awayTeam: { select: { id: true, name: true, logo: true } },
} as const

const toFixture = (f: {
    id: string
    kickoff: Date
    status: string
    fplEvent: number | null
    homeTeam: ClubRef
    awayTeam: ClubRef
}): StatsFixture => ({
    id: f.id,
    kickoff: f.kickoff,
    status: f.status,
    fplEvent: f.fplEvent,
    home: f.homeTeam,
    away: f.awayTeam,
})

export class StatsRepository implements IStatsRepository {
    async findPlayers(): Promise<StatsPlayer[]> {
        const leagueTeams = await prisma.leagueSeasonTeam.findMany({
            where: { leagueSeason: currentSeason },
            select: { team: { select: { id: true, name: true, logo: true } } },
        })
        const clubs = new Map<string, ClubRef>(leagueTeams.map((t) => [t.team.id, t.team]))
        const [players, statuses] = await Promise.all([
            prisma.player.findMany({
                // Idle legacy rows (no mapping, no match lines) are not players of this season.
                where: { OR: [{ fplMap: { isNot: null } }, { matchStats: { some: {} } }] },
                select: {
                    id: true,
                    externalId: true,
                    name: true,
                    position: true,
                    teamId: true,
                    fplMap: { select: { fplId: true } },
                    seasonPrices: {
                        where: {
                            seasonYear: SEASON,
                            priceSource: 'FPL',
                            updatedAt: { gte: new Date(Date.now() - PRICE_MAX_AGE_MS) },
                        },
                        select: { currentPrice: true },
                    },
                },
            }),
            prisma.fplPlayerStatus.findMany(),
        ])
        const statusByFpl = new Map(statuses.map((s) => [s.fplId, s]))
        const result: StatsPlayer[] = []

        for (const p of players) {
            const status = p.fplMap ? statusByFpl.get(p.fplMap.fplId) : undefined
            const club = clubs.get(status?.teamId ?? p.teamId)

            // Players of clubs outside the current Premier League (departed, relegated) are not listed.
            if (!club) continue

            result.push({
                id: p.id,
                externalId: p.externalId,
                name: p.name,
                position: p.position as Position,
                club,
                price: p.seasonPrices[0]?.currentPrice ?? null,
                availability: status
                    ? { status: status.status, chanceOfPlaying: status.chanceOfPlaying, news: status.news }
                    : null,
            })
        }

        return result
    }

    async findLines(playerId?: string): Promise<StatsLineRow[]> {
        const rows = await prisma.playerMatchStats.findMany({
            where: { ...(playerId ? { playerId } : {}), fixture: { leagueSeason: currentSeason } },
            select: {
                playerId: true,
                teamId: true,
                minutes: true,
                goals: true,
                assists: true,
                saves: true,
                yellowCards: true,
                redCards: true,
                penaltySaved: true,
                penaltyMissed: true,
                tackles: true,
                blocks: true,
                interceptions: true,
                shotsTotal: true,
                passesKey: true,
                fixture: {
                    select: {
                        id: true,
                        kickoff: true,
                        homeTeamId: true,
                        homeGoals: true,
                        awayGoals: true,
                        homeTeam: { select: { name: true } },
                        awayTeam: { select: { name: true } },
                    },
                },
            },
        })

        return rows.map((r) => {
            const isHome = r.teamId === r.fixture.homeTeamId

            return {
                playerId: r.playerId,
                fixtureId: r.fixture.id,
                kickoff: r.fixture.kickoff,
                opponentName: isHome ? r.fixture.awayTeam.name : r.fixture.homeTeam.name,
                isHome,
                minutes: r.minutes,
                goals: r.goals,
                assists: r.assists,
                saves: r.saves,
                yellowCards: r.yellowCards,
                redCards: r.redCards,
                penaltySaved: r.penaltySaved,
                penaltyMissed: r.penaltyMissed,
                tackles: r.tackles,
                blocks: r.blocks,
                interceptions: r.interceptions,
                shotsTotal: r.shotsTotal,
                passesKey: r.passesKey,
                teamGoalsAgainst: (isHome ? r.fixture.awayGoals : r.fixture.homeGoals) ?? 0,
            }
        })
    }

    private async nextEventId(): Promise<number | null> {
        const next =
            (await prisma.fplEvent.findFirst({ where: { isNext: true }, select: { id: true } })) ??
            (await prisma.fplEvent.findFirst({
                where: { finished: false },
                orderBy: { id: 'asc' },
                select: { id: true },
            }))

        return next?.id ?? null
    }

    async findNextEventFixtures(): Promise<{ event: number | null; fixtures: StatsFixture[] }> {
        const event = await this.nextEventId()

        if (event === null) return { event: null, fixtures: [] }

        const fixtures = await prisma.fixture.findMany({
            where: { fplEvent: event },
            orderBy: { kickoff: 'asc' },
            select: fixtureSelect,
        })

        return { event, fixtures: fixtures.map(toFixture) }
    }

    async findUpcomingFixtures(events: number): Promise<UpcomingFixture[]> {
        const first = await this.nextEventId()

        if (first === null) return []

        const rows = await prisma.fixture.findMany({
            where: { fplEvent: { gte: first, lt: first + events } },
            orderBy: { kickoff: 'asc' },
            select: fixtureSelect,
        })

        return rows.flatMap((r) => (r.fplEvent === null ? [] : [{ ...toFixture(r), event: r.fplEvent }]))
    }

    async findFixturesByIds(ids: string[]): Promise<StatsFixture[]> {
        if (ids.length === 0) return []

        const rows = await prisma.fixture.findMany({ where: { id: { in: ids } }, select: fixtureSelect })

        return rows.map(toFixture)
    }

    async findFplMatches(playerId: string): Promise<FormMatch[]> {
        const map = await prisma.fplPlayerMap.findUnique({ where: { playerId }, select: { fplId: true } })

        if (!map) return []

        const rows = await prisma.fplPlayerMatch.findMany({ where: { fplPlayerId: map.fplId } })
        const fixtures = await prisma.fixture.findMany({
            where: { fplFixtureId: { in: rows.map((r) => r.fplFixtureId) } },
            select: {
                id: true,
                kickoff: true,
                fplFixtureId: true,
                homeTeam: { select: { name: true } },
                awayTeam: { select: { name: true } },
            },
        })
        const byFpl = new Map(fixtures.map((f) => [f.fplFixtureId, f]))

        return rows
            .flatMap((r) => {
                const f = byFpl.get(r.fplFixtureId)

                return f
                    ? [
                          {
                              fixtureId: f.id,
                              kickoff: f.kickoff,
                              opponentName: r.wasHome ? f.awayTeam.name : f.homeTeam.name,
                              isHome: r.wasHome,
                              minutes: r.minutes,
                              started: r.starts > 0,
                              goals: r.goals,
                              xg: r.xg,
                              assists: r.assists,
                              xa: r.xa,
                          },
                      ]
                    : []
            })
            .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())
    }

    async findPenaltyOrder(playerId: string): Promise<number | null> {
        const map = await prisma.fplPlayerMap.findUnique({ where: { playerId }, select: { fplId: true } })

        if (!map) return null

        const status = await prisma.fplPlayerStatus.findUnique({
            where: { fplId: map.fplId },
            select: { penaltiesOrder: true },
        })

        return status?.penaltiesOrder ?? null
    }

    countAppearances(playerId: string): Promise<number> {
        return prisma.playerMatchStats.count({
            where: { playerId, minutes: { gt: 0 }, fixture: { leagueSeason: storedSeasons } },
        })
    }

    async findPredictions(event: number): Promise<PredictionView[]> {
        const rows = await prisma.prediction.findMany({
            where: { fplEvent: event, modelVersion: MODEL_VERSION },
            select: { playerId: true, expectedPoints: true, expectedMinutes: true, components: true },
        })

        return rows.map((r) => ({ ...r, components: r.components as Record<string, number> }))
    }

    async findSeasonLines(): Promise<SeasonLine[]> {
        const rows = await prisma.playerMatchStats.findMany({
            where: { fixture: { leagueSeason: currentSeason } },
            select: {
                playerId: true,
                teamId: true,
                minutes: true,
                goals: true,
                assists: true,
                shotsOn: true,
                passesKey: true,
                tackles: true,
                blocks: true,
                interceptions: true,
                duelsTotal: true,
                duelsWon: true,
                saves: true,
                penaltySaved: true,
                fixture: { select: { homeTeamId: true, homeGoals: true, awayGoals: true } },
            },
        })

        return rows.map((r) => {
            const isHome = r.teamId === r.fixture.homeTeamId
            // As in `findLines`: the player-level "conceded" field is only filled for goalkeepers.
            const conceded = (isHome ? r.fixture.awayGoals : r.fixture.homeGoals) ?? 0

            return {
                playerId: r.playerId,
                minutes: r.minutes,
                goals: r.goals,
                assists: r.assists,
                shotsOn: r.shotsOn,
                passesKey: r.passesKey,
                defActions: r.tackles + r.blocks + r.interceptions,
                duelsTotal: r.duelsTotal,
                duelsWon: r.duelsWon,
                saves: r.saves,
                goalsConceded: conceded,
                penaltySaved: r.penaltySaved,
                cleanSheet: r.minutes >= 60 && conceded === 0,
            }
        })
    }

    async findFplSeasonTotals(): Promise<Map<string, { xg: number | null; xa: number | null }>> {
        const [maps, rows] = await Promise.all([
            prisma.fplPlayerMap.findMany({ select: { playerId: true, fplId: true } }),
            prisma.fplPlayerMatch.findMany({ select: { fplPlayerId: true, xg: true, xa: true } }),
        ])
        const playerOf = new Map(maps.map((m) => [m.fplId, m.playerId]))
        const totals = new Map<string, { xg: number | null; xa: number | null }>()
        const plus = (a: number | null, b: number | null): number | null => (b === null ? a : (a ?? 0) + b)

        for (const r of rows) {
            const playerId = playerOf.get(r.fplPlayerId)

            if (!playerId) continue

            const t = totals.get(playerId) ?? { xg: null, xa: null }

            totals.set(playerId, { xg: plus(t.xg, r.xg), xa: plus(t.xa, r.xa) })
        }

        return totals
    }
}

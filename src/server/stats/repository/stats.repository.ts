import { MODEL_VERSION } from '@/server/prediction/lib/model'

import { LEAGUE_ID, SEASON } from '@/shared/config/league'
import { prisma } from '@/shared/lib/prisma'

import type {
    ClubRef,
    IStatsRepository,
    PredictionView,
    StatsFixture,
    StatsLineRow,
    StatsPlayer,
} from './stats.repository.interface'
import type { Position } from '@/server/prediction/lib/scoring-rules'

/** A price older than this is treated as missing (the sync runs daily). */
const PRICE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000

const currentSeason = { year: SEASON, league: { externalId: LEAGUE_ID } }

export class StatsRepository implements IStatsRepository {
    async findPlayers(): Promise<StatsPlayer[]> {
        const leagueTeams = await prisma.leagueSeasonTeam.findMany({
            where: { leagueSeason: currentSeason },
            select: { team: { select: { id: true, name: true, logo: true } } },
        })
        const clubs = new Map<string, ClubRef>(leagueTeams.map((t) => [t.team.id, t.team]))
        const [players, statuses] = await Promise.all([
            prisma.player.findMany({
                where: { OR: [{ teamId: { in: [...clubs.keys()] } }, { fplMap: { isNot: null } }] },
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

    async findNextEventFixtures(): Promise<{ event: number | null; fixtures: StatsFixture[] }> {
        const next =
            (await prisma.fplEvent.findFirst({ where: { isNext: true }, select: { id: true } })) ??
            (await prisma.fplEvent.findFirst({
                where: { finished: false },
                orderBy: { id: 'asc' },
                select: { id: true },
            }))

        if (!next) return { event: null, fixtures: [] }

        const fixtures = await prisma.fixture.findMany({
            where: { fplEvent: next.id },
            orderBy: { kickoff: 'asc' },
            select: {
                id: true,
                kickoff: true,
                status: true,
                homeTeam: { select: { id: true, name: true, logo: true } },
                awayTeam: { select: { id: true, name: true, logo: true } },
            },
        })

        return {
            event: next.id,
            fixtures: fixtures.map((f) => ({
                id: f.id,
                kickoff: f.kickoff,
                status: f.status,
                home: f.homeTeam,
                away: f.awayTeam,
            })),
        }
    }

    async findPredictions(event: number): Promise<PredictionView[]> {
        const rows = await prisma.prediction.findMany({
            where: { fplEvent: event, modelVersion: MODEL_VERSION },
            select: { playerId: true, expectedPoints: true, expectedMinutes: true, components: true },
        })

        return rows.map((r) => ({ ...r, components: r.components as Record<string, number> }))
    }
}

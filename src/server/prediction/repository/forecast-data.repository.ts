import { LEAGUE_ID, SEASON } from '@/shared/config/league'
import { prisma } from '@/shared/lib/prisma'

import type { IForecastDataRepository } from './forecast-data.repository.interface'
import type { ForecastDataset } from '../lib/inputs'
import type { Position } from '../lib/scoring-rules'

export class ForecastDataRepository implements IForecastDataRepository {
    async loadDataset(): Promise<ForecastDataset> {
        const [stats, fixtures, maps, statuses, points, events] = await Promise.all([
            prisma.playerMatchStats.findMany({
                where: {
                    fixture: {
                        leagueSeason: {
                            league: { externalId: LEAGUE_ID },
                            year: { in: [SEASON, SEASON - 1] },
                        },
                    },
                },
                select: {
                    fixtureId: true,
                    playerId: true,
                    teamId: true,
                    position: true,
                    minutes: true,
                    goals: true,
                    assists: true,
                    saves: true,
                    yellowCards: true,
                    redCards: true,
                    tackles: true,
                    blocks: true,
                    interceptions: true,
                    fixture: { select: { kickoff: true } },
                },
            }),
            prisma.fixture.findMany({
                where: {
                    leagueSeason: { league: { externalId: LEAGUE_ID }, year: { in: [SEASON, SEASON - 1] } },
                },
                select: {
                    id: true,
                    kickoff: true,
                    homeTeamId: true,
                    awayTeamId: true,
                    homeGoals: true,
                    awayGoals: true,
                    fplEvent: true,
                    status: true,
                },
            }),
            prisma.fplPlayerMap.findMany({
                select: { fplId: true, playerId: true, player: { select: { position: true, teamId: true } } },
            }),
            prisma.fplPlayerStatus.findMany(),
            prisma.fplEventPoints.findMany({
                select: { fplPlayerId: true, event: true, totalPoints: true, minutes: true },
            }),
            prisma.fplEvent.findMany({ select: { id: true, finished: true, isNext: true, isCurrent: true } }),
        ])

        const statusByFpl = new Map(statuses.map((s) => [s.fplId, s]))
        const playerByFpl = new Map(maps.map((m) => [m.fplId, m.playerId]))
        const fplPoints: ForecastDataset['fplPoints'] = new Map()

        for (const row of points) {
            const playerId = playerByFpl.get(row.fplPlayerId)

            if (!playerId) continue

            const perEvent = fplPoints.get(playerId) ?? new Map()

            perEvent.set(row.event, { totalPoints: row.totalPoints, minutes: row.minutes })
            fplPoints.set(playerId, perEvent)
        }

        return {
            matches: stats.map((s) => ({
                kickoff: s.fixture.kickoff,
                fixtureId: s.fixtureId,
                teamId: s.teamId,
                playerId: s.playerId,
                minutes: s.minutes,
                goals: s.goals,
                assists: s.assists,
                saves: s.saves,
                yellowCards: s.yellowCards,
                redCards: s.redCards,
                tackles: s.tackles,
                blocks: s.blocks,
                interceptions: s.interceptions,
                position: s.position as Position | null,
            })),
            fixtures: fixtures.map((f) => ({
                fixtureId: f.id,
                kickoff: f.kickoff,
                homeTeamId: f.homeTeamId,
                awayTeamId: f.awayTeamId,
                homeGoals: f.homeGoals,
                awayGoals: f.awayGoals,
                fplEvent: f.fplEvent,
                status: f.status,
            })),
            players: maps.map((m) => ({
                playerId: m.playerId,
                fplId: m.fplId,
                position: m.player.position as Position,
                currentTeamId: statusByFpl.get(m.fplId)?.teamId ?? m.player.teamId,
            })),
            fplPoints,
            availability: new Map(
                maps
                    .filter((m) => statusByFpl.has(m.fplId))
                    .map((m) => {
                        const s = statusByFpl.get(m.fplId)

                        return [
                            m.playerId,
                            { status: s?.status ?? 'a', chanceOfPlaying: s?.chanceOfPlaying ?? null },
                        ]
                    }),
            ),
            events,
        }
    }
}

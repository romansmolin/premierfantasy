import { LEAGUE_ID } from '@/shared/config/league'
import { prisma } from '@/shared/lib/prisma'

import type { IFplMappingRepository } from './fpl-mapping.repository.interface'
import type { OurPlayer } from '../lib/player-matcher'

export class FplMappingRepository implements IFplMappingRepository {
    async findMappings(): Promise<{ fplId: number; playerId: string; method: string; confidence: number }[]> {
        return prisma.fplPlayerMap.findMany({
            select: { fplId: true, playerId: true, method: true, confidence: true },
        })
    }

    async findRejectedFplIds(): Promise<Set<number>> {
        const rows = await prisma.fplPlayerMapRejection.findMany({ select: { fplId: true } })

        return new Set(rows.map((row) => row.fplId))
    }

    async findLeaguePlayers(seasonYear: number): Promise<OurPlayer[]> {
        return prisma.player.findMany({
            where: {
                team: {
                    leagueSeasons: {
                        some: { leagueSeason: { year: seasonYear, league: { externalId: LEAGUE_ID } } },
                    },
                },
            },
            select: { id: true, name: true, position: true, teamId: true },
        })
    }

    async findFplTeamMap(): Promise<Map<number, string>> {
        const teams = await prisma.team.findMany({
            where: { fplId: { not: null } },
            select: { id: true, fplId: true },
        })

        return new Map(teams.map((team) => [team.fplId as number, team.id]))
    }

    async playerExists(playerId: string): Promise<boolean> {
        return (await prisma.player.count({ where: { id: playerId } })) > 0
    }

    async createManualMapping(fplId: number, playerId: string): Promise<void> {
        await prisma.fplPlayerMap.create({ data: { fplId, playerId, method: 'MANUAL', confidence: 1 } })
    }

    async deleteMapping(fplId: number): Promise<void> {
        await prisma.fplPlayerMap.deleteMany({ where: { fplId } })
    }

    async createRejection(fplId: number): Promise<void> {
        await prisma.fplPlayerMapRejection.upsert({ where: { fplId }, create: { fplId }, update: {} })
    }

    async deleteRejection(fplId: number): Promise<void> {
        await prisma.fplPlayerMapRejection.deleteMany({ where: { fplId } })
    }
}

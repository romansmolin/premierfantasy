import { Errors } from '@/shared/lib/http'

import { matchPlayers, POSITION_BY_ELEMENT_TYPE } from '../lib/player-matcher'

import type { FplMappingList, IFplMappingService } from './fpl-mapping.service.interface'
import type { IFplClient } from '../lib/fpl-client'
import type { IFplMappingRepository } from '../repository/fpl-mapping.repository.interface'

const MIN_MINUTES = 90

export class FplMappingService implements IFplMappingService {
    private readonly repo: IFplMappingRepository
    private readonly client: IFplClient

    constructor(repo: IFplMappingRepository, client: IFplClient) {
        this.repo = repo
        this.client = client
    }

    async listUnmapped(seasonYear: number): Promise<FplMappingList> {
        const [bootstrap, mappings, rejected, teamMap, allPlayers] = await Promise.all([
            this.client.getBootstrap(),
            this.repo.findMappings(),
            this.repo.findRejectedFplIds(),
            this.repo.findFplTeamMap(),
            this.repo.findLeaguePlayers(seasonYear),
        ])
        const mappedFplIds = new Set(mappings.map((m) => m.fplId))
        const mappedPlayerIds = new Set(mappings.map((m) => m.playerId))
        const freePlayers = allPlayers.filter((p) => !mappedPlayerIds.has(p.id))
        const teamNames = new Map(bootstrap.teams.map((t) => [t.id, t.name]))
        const pending = bootstrap.elements.filter(
            (e) => e.minutes >= MIN_MINUTES && !mappedFplIds.has(e.id) && !rejected.has(e.id),
        )
        const { ambiguous } = matchPlayers(pending, freePlayers, teamMap)
        const scores = new Map(
            ambiguous.map((a) => [a.fplId, new Map(a.candidates.map((c) => [c.playerId, c.score]))]),
        )

        const unmapped = pending.map((element) => {
            const position = POSITION_BY_ELEMENT_TYPE[element.element_type]
            const teamId = teamMap.get(element.team)

            return {
                fplId: element.id,
                name: `${element.first_name} ${element.second_name}`,
                team: teamNames.get(element.team) ?? String(element.team),
                position,
                nowCost: element.now_cost / 10,
                minutes: element.minutes,
                candidates: freePlayers
                    .filter((p) => p.teamId === teamId && p.position === position)
                    .map((p) => ({
                        playerId: p.id,
                        name: p.name,
                        score: scores.get(element.id)?.get(p.id) ?? 0,
                    }))
                    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
            }
        })
        const ambiguousIds = new Set(ambiguous.map((a) => a.fplId))

        return {
            unmapped,
            counts: {
                mapped: mappings.length,
                ambiguous: unmapped.filter((u) => ambiguousIds.has(u.fplId)).length,
                unmatched: unmapped.filter((u) => !ambiguousIds.has(u.fplId)).length,
                rejected: rejected.size,
            },
        }
    }

    async confirm(fplId: number, playerId: string): Promise<void> {
        if (!(await this.repo.playerExists(playerId))) throw Errors.notFound('Player not found')

        const mappings = await this.repo.findMappings()

        if (mappings.some((m) => m.fplId === fplId && m.playerId === playerId)) return

        if (mappings.some((m) => m.fplId === fplId))
            throw Errors.conflict('This FPL player is already mapped')

        if (mappings.some((m) => m.playerId === playerId))
            throw Errors.conflict('This player is already mapped')

        await this.repo.deleteRejection(fplId)
        await this.repo.createManualMapping(fplId, playerId)
    }

    async reject(fplId: number): Promise<void> {
        const mappings = await this.repo.findMappings()

        if (mappings.some((m) => m.fplId === fplId))
            throw Errors.conflict('This FPL player is already mapped')

        if ((await this.repo.findRejectedFplIds()).has(fplId)) return

        await this.repo.createRejection(fplId)
    }
}

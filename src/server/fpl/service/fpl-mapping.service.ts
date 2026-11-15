import { Errors } from '@/shared/lib/http'

import { matchPlayers, POSITION_BY_ELEMENT_TYPE } from '../lib/player-matcher'

import type { AutoMappingReview, FplMappingList, IFplMappingService } from './fpl-mapping.service.interface'
import type { IFplClient } from '../lib/fpl-client'
import type { OurPlayer } from '../lib/player-matcher'
import type { IFplMappingRepository } from '../repository/fpl-mapping.repository.interface'

const MIN_MINUTES = 90

type Candidate = { playerId: string; name: string; score: number }

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
        const playerNames = new Map(allPlayers.map((p) => [p.id, p.name]))
        const teamNames = new Map(bootstrap.teams.map((t) => [t.id, t.name]))
        const elements = new Map(bootstrap.elements.map((e) => [e.id, e]))
        const pending = bootstrap.elements.filter(
            (e) => e.minutes >= MIN_MINUTES && !mappedFplIds.has(e.id) && !rejected.has(e.id),
        )
        const { ambiguous } = matchPlayers(pending, freePlayers, teamMap)
        const scores = new Map(
            ambiguous.map((a) => [a.fplId, new Map(a.candidates.map((c) => [c.playerId, c.score]))]),
        )

        const unmapped = pending.map((element) => {
            const position = POSITION_BY_ELEMENT_TYPE[element.element_type]

            return {
                fplId: element.id,
                name: `${element.first_name} ${element.second_name}`,
                team: teamNames.get(element.team) ?? String(element.team),
                position,
                nowCost: element.now_cost / 10,
                minutes: element.minutes,
                candidates: this.candidatesFor(
                    freePlayers,
                    teamMap.get(element.team),
                    position,
                    scores.get(element.id),
                ),
            }
        })
        const ambiguousIds = new Set(ambiguous.map((a) => a.fplId))

        const review: AutoMappingReview[] = mappings
            .filter((m) => m.method === 'AUTO' && m.confidence < 1)
            .map((m) => {
                const element = elements.get(m.fplId)

                return {
                    fplId: m.fplId,
                    fplName: element ? `${element.first_name} ${element.second_name}` : `FPL #${m.fplId}`,
                    team: element ? (teamNames.get(element.team) ?? String(element.team)) : '',
                    playerId: m.playerId,
                    playerName: playerNames.get(m.playerId) ?? m.playerId,
                    confidence: m.confidence,
                    candidates: element
                        ? this.candidatesFor(
                              freePlayers,
                              teamMap.get(element.team),
                              POSITION_BY_ELEMENT_TYPE[element.element_type],
                          )
                        : [],
                }
            })

        return {
            unmapped,
            review,
            counts: {
                mapped: mappings.length,
                ambiguous: unmapped.filter((u) => ambiguousIds.has(u.fplId)).length,
                unmatched: unmapped.filter((u) => !ambiguousIds.has(u.fplId)).length,
                rejected: rejected.size,
                autoToReview: review.length,
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

    async replace(fplId: number, playerId: string): Promise<void> {
        if (!(await this.repo.playerExists(playerId))) throw Errors.notFound('Player not found')

        const mappings = await this.repo.findMappings()

        if (mappings.some((m) => m.playerId === playerId && m.fplId !== fplId)) {
            throw Errors.conflict('This player is already mapped to another FPL player')
        }

        if (mappings.some((m) => m.fplId === fplId && m.playerId === playerId && m.method === 'MANUAL'))
            return

        await this.repo.deleteMapping(fplId)
        await this.repo.deleteRejection(fplId)
        await this.repo.createManualMapping(fplId, playerId)
    }

    async unmap(fplId: number): Promise<void> {
        const mappings = await this.repo.findMappings()

        if (!mappings.some((m) => m.fplId === fplId)) throw Errors.notFound('This FPL player has no mapping')

        await this.repo.deleteMapping(fplId)
        await this.repo.createRejection(fplId)
    }

    async reject(fplId: number): Promise<void> {
        const mappings = await this.repo.findMappings()

        if (mappings.some((m) => m.fplId === fplId))
            throw Errors.conflict('This FPL player is already mapped')

        if ((await this.repo.findRejectedFplIds()).has(fplId)) return

        await this.repo.createRejection(fplId)
    }

    /** Free players of the club; same position first, goalkeepers only for goalkeepers (the sources disagree on outfield positions). */
    private candidatesFor(
        freePlayers: OurPlayer[],
        teamId: string | undefined,
        position: OurPlayer['position'],
        scores?: Map<string, number>,
    ): Candidate[] {
        return freePlayers
            .filter(
                (p) => p.teamId === teamId && (position === 'GK' ? p.position === 'GK' : p.position !== 'GK'),
            )
            .map((p) => ({
                playerId: p.id,
                name: p.name,
                score: scores?.get(p.id) ?? 0,
                samePosition: p.position === position,
            }))
            .sort(
                (a, b) =>
                    Number(b.samePosition) - Number(a.samePosition) ||
                    b.score - a.score ||
                    a.name.localeCompare(b.name),
            )
            .map(({ playerId, name, score }) => ({ playerId, name, score }))
    }
}

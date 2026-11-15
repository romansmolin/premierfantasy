import { DEFAULT_SQUAD_RULES, validateSquad } from '@/entities/squad/model/rules'
import type { SquadRules } from '@/entities/squad/model/rules'
import type { SavedSquad, SquadInput } from '@/entities/squad/model/squad.types'

import { Errors } from '@/shared/lib/http'

import type { ISquadService } from './squad.service.interface'
import type { ISquadRepository, SquadWrite, StoredSquad } from '../repository/squad.repository.interface'

const MAX_SQUADS_PER_USER = 50

export class SquadService implements ISquadService {
    private readonly repo: ISquadRepository

    constructor(repo: ISquadRepository) {
        this.repo = repo
    }

    async list(userId: string): Promise<SavedSquad[]> {
        const squads = await this.repo.findByUser(userId)

        return Promise.all(squads.map((s) => this.present(s)))
    }

    async get(userId: string, id: string): Promise<SavedSquad> {
        const squad = await this.repo.findOwned(userId, id)

        if (!squad) throw Errors.notFound('Squad not found')

        return this.present(squad)
    }

    async create(userId: string, input: SquadInput): Promise<SavedSquad> {
        if ((await this.repo.countByUser(userId)) >= MAX_SQUADS_PER_USER) {
            throw Errors.unprocessable(`You can keep up to ${MAX_SQUADS_PER_USER} squads`)
        }

        return this.present(await this.repo.create(userId, await this.prepare(input)))
    }

    async update(userId: string, id: string, input: SquadInput): Promise<SavedSquad> {
        if (!(await this.repo.findOwned(userId, id))) throw Errors.notFound('Squad not found')

        return this.present(await this.repo.replace(id, await this.prepare(input)))
    }

    async remove(userId: string, id: string): Promise<void> {
        if (!(await this.repo.findOwned(userId, id))) throw Errors.notFound('Squad not found')

        await this.repo.delete(id)
    }

    private async rules(): Promise<SquadRules> {
        return (await this.repo.findRules()) ?? DEFAULT_SQUAD_RULES
    }

    /** Validates on the server (the client's check is a convenience) and records the prices at save time. */
    private async prepare(input: SquadInput): Promise<SquadWrite> {
        const ids = [...input.starters, ...input.bench]
        const infos = await this.repo.findPlayerInfos(ids)
        const pool = new Map(infos.map((p) => [p.playerId, p]))
        const result = validateSquad(input, pool, await this.rules())

        if (!result.valid) throw Errors.unprocessable(result.errors.join('. '), result.errors)

        return {
            name: input.name,
            captainPlayerId: input.captainId,
            viceCaptainPlayerId: input.viceCaptainId,
            players: [
                ...input.starters.map((playerId, position) => ({
                    playerId,
                    slot: 'START' as const,
                    position,
                    priceTenthsAtSave: pool.get(playerId)?.priceTenths ?? null,
                })),
                ...input.bench.map((playerId, position) => ({
                    playerId,
                    slot: 'BENCH' as const,
                    position,
                    priceTenthsAtSave: pool.get(playerId)?.priceTenths ?? null,
                })),
            ],
        }
    }

    private async present(squad: StoredSquad): Promise<SavedSquad> {
        const byOrder = (slot: 'START' | 'BENCH') =>
            squad.players.filter((p) => p.slot === slot).sort((a, b) => a.position - b.position)
        const starters = byOrder('START').map((p) => p.playerId)
        const bench = byOrder('BENCH').map((p) => p.playerId)
        const infos = await this.repo.findPlayerInfos([...starters, ...bench])
        const pool = new Map(infos.map((p) => [p.playerId, p]))
        const draft = {
            starters,
            bench,
            captainId: squad.captainPlayerId,
            viceCaptainId: squad.viceCaptainPlayerId,
        }
        const validation = validateSquad(draft, pool, await this.rules())
        const savedTotal = squad.players.every((p) => p.priceTenthsAtSave !== null)
            ? squad.players.reduce((sum, p) => sum + (p.priceTenthsAtSave as number), 0)
            : null

        return {
            id: squad.id,
            name: squad.name,
            ...draft,
            updatedAt: squad.updatedAt.toISOString(),
            validation,
            priceDriftTenths:
                validation.totalTenths !== null && savedTotal !== null
                    ? validation.totalTenths - savedTotal
                    : null,
        }
    }
}

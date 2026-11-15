import { DEFAULT_SQUAD_RULES } from '@/entities/squad/model/rules'
import type { BuilderPool } from '@/entities/squad/model/squad.types'

import type { ISquadRepository } from '../repository/squad.repository.interface'
import type { IStatsService } from '@/server/stats/service/stats.service.interface'

export interface IBuilderService {
    getPool(): Promise<BuilderPool>
}

export class BuilderService implements IBuilderService {
    private readonly stats: IStatsService
    private readonly squads: ISquadRepository

    constructor(stats: IStatsService, squads: ISquadRepository) {
        this.stats = stats
        this.squads = squads
    }

    async getPool(): Promise<BuilderPool> {
        const [{ items, forecastEnabled, nextEvent }, rules] = await Promise.all([
            this.stats.getAllPlayers(),
            this.squads.findRules(),
        ])

        return {
            rules: rules ?? DEFAULT_SQUAD_RULES,
            forecastEnabled,
            nextEvent,
            players: items.map((p) => ({
                id: p.id,
                name: p.name,
                clubId: p.club.id,
                clubName: p.club.name,
                position: p.position,
                priceTenths: p.price === null ? null : Math.round(p.price * 10),
                minutes: p.minutes,
                form: p.form,
                forecast: p.forecast,
                availability: p.availability,
            })),
        }
    }
}

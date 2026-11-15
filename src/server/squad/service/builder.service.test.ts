import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SQUAD_RULES } from '@/entities/squad/model/rules'

import { BuilderService } from './builder.service'

import type { ISquadRepository } from '../repository/squad.repository.interface'
import type { IStatsService } from '@/server/stats/service/stats.service.interface'

const stats = (price: number | null) =>
    ({
        getAllPlayers: vi.fn().mockResolvedValue({
            forecastEnabled: true,
            nextEvent: 11,
            items: [
                {
                    id: 'p1',
                    name: 'A',
                    club: { id: 'c', name: 'C', logo: null },
                    position: 'MID',
                    price,
                    minutes: 90,
                    goals: 0,
                    assists: 0,
                    form: 4,
                    forecast: 5,
                    availability: null,
                },
            ],
        }),
    }) as unknown as IStatsService

describe('BuilderService.getPool', () => {
    it('converts prices to tenths and falls back to default rules', async () => {
        const squads = { findRules: vi.fn().mockResolvedValue(null) } as unknown as ISquadRepository
        const pool = await new BuilderService(stats(6.2), squads).getPool()

        expect(pool.players[0]).toMatchObject({ priceTenths: 62, clubName: 'C', forecast: 5 })
        expect(pool.rules).toEqual(DEFAULT_SQUAD_RULES)
    })

    it('keeps a missing price as null and uses stored rules when present', async () => {
        const rules = { ...DEFAULT_SQUAD_RULES, budgetTenths: 950 }
        const squads = { findRules: vi.fn().mockResolvedValue(rules) } as unknown as ISquadRepository
        const pool = await new BuilderService(stats(null), squads).getPool()

        expect(pool.players[0].priceTenths).toBeNull()
        expect(pool.rules.budgetTenths).toBe(950)
    })
})

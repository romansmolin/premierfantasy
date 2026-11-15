import { describe, expect, it, vi } from 'vitest'

import { StatsService } from './stats.service'

import type { IStatsRepository, StatsLineRow, StatsPlayer } from '../repository/stats.repository.interface'
import type { IForecastService } from '@/server/prediction/service/forecast.service.interface'

const club = (id: string, name = id) => ({ id, name, logo: null })

const player = (
    id: string,
    name: string,
    position: StatsPlayer['position'],
    clubId: string,
    price: number | null = 6,
): StatsPlayer => ({
    id,
    externalId: Number(id.replace(/\D/g, '')) || 1,
    name,
    position,
    club: club(clubId),
    price,
    availability: null,
})

const line = (playerId: string, day: number, overrides: Partial<StatsLineRow> = {}): StatsLineRow => ({
    playerId,
    fixtureId: `f${day}`,
    opponentName: 'Opp',
    isHome: true,
    kickoff: new Date(Date.UTC(2026, 8, day)),
    minutes: 90,
    goals: 0,
    assists: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    penaltySaved: 0,
    penaltyMissed: 0,
    tackles: 0,
    blocks: 0,
    interceptions: 0,
    shotsTotal: 1,
    passesKey: 0,
    teamGoalsAgainst: 1,
    ...overrides,
})

const players = [
    player('p1', 'Mohamed Salah', 'MID', 'LIV', 14),
    player('p2', 'Erling Haaland', 'FWD', 'MCI', 14.5),
    player('p3', 'Gabriel Magalhães', 'DEF', 'ARS', 6),
    player('p4', 'No Data', 'GK', 'ARS', null),
]

const lines = [
    line('p1', 1, { goals: 1 }),
    line('p1', 2),
    line('p2', 1, { goals: 2 }),
    line('p3', 1, { teamGoalsAgainst: 0 }),
]

const make = (enabled: boolean) => {
    const repo = {
        findPlayers: vi.fn().mockResolvedValue(players),
        findLines: vi
            .fn()
            .mockImplementation(async (id?: string) => (id ? lines.filter((l) => l.playerId === id) : lines)),
        findNextEventFixtures: vi.fn().mockResolvedValue({ event: 11, fixtures: [] }),
        findPredictions: vi.fn().mockResolvedValue([
            { playerId: 'p1', expectedPoints: 7, expectedMinutes: 88, components: { goals: 2 } },
            { playerId: 'p3', expectedPoints: 5, expectedMinutes: 90, components: {} },
        ]),
    } satisfies IStatsRepository
    const forecast = {
        run: vi.fn(),
        getStatus: vi.fn().mockResolvedValue({ enabled, nextEvent: 11, evaluation: null }),
    } satisfies IForecastService

    return new StatsService(repo, forecast)
}

describe('StatsService.getPlayers', () => {
    it('filters by position, club and search ignoring case and accents', async () => {
        const service = make(true)

        expect((await service.getPlayers({ position: 'FWD' })).items.map((i) => i.id)).toEqual(['p2'])
        expect((await service.getPlayers({ clubId: 'ARS' })).total).toBe(2)
        expect((await service.getPlayers({ search: 'magalhaes' })).items.map((i) => i.id)).toEqual(['p3'])
        expect((await service.getPlayers({ search: 'SALAH' })).items.map((i) => i.id)).toEqual(['p1'])
    })

    it('sorts by forecast when it is enabled, nulls last', async () => {
        const result = await make(true).getPlayers({})

        expect(result.sort).toBe('forecast')
        expect(result.items.map((i) => i.id).slice(0, 2)).toEqual(['p1', 'p3'])
    })

    it('hides the forecast and falls back to form when the bar is not passed', async () => {
        const result = await make(false).getPlayers({ sort: 'forecast' })

        expect(result.forecastEnabled).toBe(false)
        expect(result.items.every((i) => i.forecast === null)).toBe(true)
        expect(result.sort).toBe('form')
    })

    it('computes totals and form per player', async () => {
        const salah = (await make(true).getPlayers({ search: 'salah' })).items[0]

        expect(salah).toMatchObject({ minutes: 180, goals: 1, price: 14 })
        expect(salah.form).not.toBeNull()
    })

    it('a player without lines or price renders with nulls', async () => {
        const item = (await make(true).getPlayers({ search: 'no data' })).items[0]

        expect(item).toMatchObject({ minutes: 0, form: null, price: null, forecast: null })
    })

    it('paginates 50 per page and lists the clubs', async () => {
        const result = await make(true).getPlayers({ page: 2 })

        expect(result.pageSize).toBe(50)
        expect(result.items).toEqual([])
        expect(result.clubs.map((c) => c.id).sort()).toEqual(['ARS', 'LIV', 'MCI'])
    })
})

describe('StatsService.getPlayer', () => {
    it('returns null for an unknown id', async () => {
        expect(await make(true).getPlayer('nope')).toBeNull()
    })

    it('returns the profile with recent matches and the forecast when enabled', async () => {
        const profile = await make(true).getPlayer('p1')

        expect(profile?.recent).toHaveLength(2)
        expect(profile?.recent[0].kickoff.getTime()).toBeGreaterThan(
            profile?.recent[1].kickoff.getTime() as number,
        )
        expect(profile?.forecast).toMatchObject({ event: 11, expectedPoints: 7 })
    })

    it('has no forecast when the bar is not passed', async () => {
        const profile = await make(false).getPlayer('p1')

        expect(profile?.forecast).toBeNull()
        expect(profile?.forecastEnabled).toBe(false)
    })

    it('works for a player with no data at all', async () => {
        const profile = await make(true).getPlayer('p4')

        expect(profile?.recent).toEqual([])
        expect(profile?.form).toBeNull()
        expect(profile?.forecast).toBeNull()
    })
})

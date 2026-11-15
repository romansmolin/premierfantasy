import { describe, expect, it, vi } from 'vitest'

import { RequestBudget } from '@/server/sync/lib/request-budget'

import { MatchStatsSyncService } from './match-stats-sync.service'

import type { ApiFixturePlayers } from '../lib/match-stats.types'
import type { PlayerMatchStatsRow } from '../lib/match-stats.types'
import type { IMatchDataRepository } from '../repository/match-data.repository.interface'

const stat = (position: string | null = 'M', minutes: number | null = 90) => ({
    games: { minutes, position, rating: '6.5', substitute: false },
    shots: { total: 1, on: 0 },
    goals: { total: 0, conceded: 0, assists: 0, saves: 0 },
    passes: { total: 10, key: 1, accuracy: '80' },
    tackles: { total: 1, blocks: 0, interceptions: 0 },
    duels: { total: 4, won: 2 },
    dribbles: { attempts: 1, success: 1 },
    fouls: { drawn: 0, committed: 1 },
    cards: { yellow: 0, red: 0 },
    penalty: { won: 0, commited: 0, scored: 0, missed: 0, saved: 0 },
})

const teamBlock = (
    teamId: number,
    players: { id: number; name: string; position?: string | null }[],
): ApiFixturePlayers => ({
    team: { id: teamId },
    players: players.map((p) => ({
        player: { id: p.id, name: p.name },
        statistics: [stat(p.position === undefined ? 'M' : p.position)],
    })),
})

interface FakeFixture {
    id: string
    externalId: number
    season: number
}

const makeRepo = (fixtures: FakeFixture[], opts: { knownPlayers?: number[]; knownTeams?: number[] } = {}) => {
    const synced = new Set<string>()
    const attempts = new Map<string, number>()
    const saved = new Map<string, PlayerMatchStatsRow[]>()
    const created: { externalId: number; name: string; position: string; teamId: string }[] = []
    const knownPlayers = new Map(
        (opts.knownPlayers ?? [101]).map((id) => [id, { id: `p-${id}`, position: 'MID' as const }]),
    )
    const knownTeams = new Map((opts.knownTeams ?? [10, 20]).map((id) => [id, `t-${id}`]))

    const repo = {
        findFixturesNeedingStats: vi
            .fn()
            .mockImplementation(async (season: number) =>
                fixtures.filter((f) => f.season === season && !synced.has(f.id)),
            ),
        findTeamIdsByExternalIds: vi.fn().mockImplementation(async () => knownTeams),
        findPlayersByExternalIds: vi
            .fn()
            .mockImplementation(
                async (ids: number[]) => new Map([...knownPlayers].filter(([id]) => ids.includes(id))),
            ),
        createPlayers: vi
            .fn()
            .mockImplementation(
                async (rows: { externalId: number; name: string; position: string; teamId: string }[]) => {
                    for (const row of rows) {
                        created.push(row)
                        knownPlayers.set(row.externalId, {
                            id: `p-${row.externalId}`,
                            position: row.position as 'MID',
                        })
                    }

                    return new Map(rows.map((row) => [row.externalId, `p-${row.externalId}`]))
                },
            ),
        saveFixtureStats: vi
            .fn()
            .mockImplementation(async (fixtureId: string, rows: PlayerMatchStatsRow[]) => {
                saved.set(fixtureId, rows)
                synced.add(fixtureId)
            }),
        incrementStatsAttempts: vi.fn().mockImplementation(async (fixtureId: string) => {
            attempts.set(fixtureId, (attempts.get(fixtureId) ?? 0) + 1)
        }),
    } as unknown as IMatchDataRepository

    return { repo, synced, attempts, saved, created }
}

const makeHttp = (byFixture: Record<number, ApiFixturePlayers[]>, dailyRemaining: number | null = 7000) => ({
    get: vi.fn().mockImplementation(async (_endpoint: string, params?: Record<string, string | number>) => ({
        data: byFixture[Number(params?.fixture)] ?? [],
        dailyRemaining,
    })),
})

describe('MatchStatsSyncService.syncMatchStats', () => {
    it('saves stats and marks the fixture synced', async () => {
        const { repo, saved } = makeRepo([{ id: 'f1', externalId: 1, season: 2026 }])
        const http = makeHttp({ 1: [teamBlock(10, [{ id: 101, name: 'A. Player' }])] })

        const result = await new MatchStatsSyncService(repo, http).syncMatchStats(
            [2026],
            new RequestBudget(10),
        )

        expect(result.status).toBe('OK')
        expect(result.stats).toMatchObject({ fixtures: 1, rows: 1 })
        expect(saved.get('f1')).toEqual([
            expect.objectContaining({ playerId: 'p-101', teamId: 't-10', minutes: 90 }),
        ])
    })

    it('an empty response increments attempts and leaves the fixture unsynced', async () => {
        const { repo, attempts, synced } = makeRepo([{ id: 'f1', externalId: 1, season: 2026 }])

        const result = await new MatchStatsSyncService(repo, makeHttp({})).syncMatchStats(
            [2026],
            new RequestBudget(10),
        )

        expect(attempts.get('f1')).toBe(1)
        expect(synced.has('f1')).toBe(false)
        expect(repo.saveFixtureStats).not.toHaveBeenCalled()
        expect(result.stats).toMatchObject({ emptyResponses: 1 })
    })

    it('a second run requests nothing for already synced fixtures', async () => {
        const { repo } = makeRepo([{ id: 'f1', externalId: 1, season: 2026 }])
        const http = makeHttp({ 1: [teamBlock(10, [{ id: 101, name: 'A. Player' }])] })
        const service = new MatchStatsSyncService(repo, http)

        await service.syncMatchStats([2026], new RequestBudget(10))
        http.get.mockClear()
        const second = await service.syncMatchStats([2026], new RequestBudget(10))

        expect(http.get).not.toHaveBeenCalled()
        expect(second.stats).toMatchObject({ fixtures: 0, rows: 0 })
    })

    it('creates a newcomer of a known club', async () => {
        const { repo, created } = makeRepo([{ id: 'f1', externalId: 1, season: 2026 }])
        const http = makeHttp({ 1: [teamBlock(10, [{ id: 555, name: 'N. Newcomer', position: 'D' }])] })

        const result = await new MatchStatsSyncService(repo, http).syncMatchStats(
            [2026],
            new RequestBudget(10),
        )

        expect(created).toEqual([{ externalId: 555, name: 'N. Newcomer', position: 'DEF', teamId: 't-10' }])
        expect(result.stats).toMatchObject({ createdPlayers: 1, rows: 1 })
    })

    it('skips a player of an unknown club and counts it', async () => {
        const { repo, created, saved } = makeRepo([{ id: 'f1', externalId: 1, season: 2026 }], {
            knownTeams: [10],
        })
        const http = makeHttp({
            1: [
                teamBlock(10, [{ id: 101, name: 'A. Player' }]),
                teamBlock(99, [{ id: 777, name: 'X. Stranger' }]),
            ],
        })

        const result = await new MatchStatsSyncService(repo, http).syncMatchStats(
            [2026],
            new RequestBudget(10),
        )

        expect(created).toEqual([])
        expect(saved.get('f1')).toHaveLength(1)
        expect(result.stats).toMatchObject({ skippedUnknownTeam: 1 })
    })

    it('skips a newcomer whose position is missing and counts it', async () => {
        const { repo, created } = makeRepo([{ id: 'f1', externalId: 1, season: 2026 }])
        const http = makeHttp({ 1: [teamBlock(10, [{ id: 555, name: 'N. Newcomer', position: null }])] })

        const result = await new MatchStatsSyncService(repo, http).syncMatchStats(
            [2026],
            new RequestBudget(10),
        )

        expect(created).toEqual([])
        expect(result.stats).toMatchObject({ skippedNoPosition: 1 })
    })

    it('stops with PARTIAL when the budget is exhausted and keeps what it saved', async () => {
        const { repo, saved } = makeRepo([
            { id: 'f1', externalId: 1, season: 2026 },
            { id: 'f2', externalId: 2, season: 2026 },
        ])
        const block = [teamBlock(10, [{ id: 101, name: 'A. Player' }])]
        const http = makeHttp({ 1: block, 2: block })

        const result = await new MatchStatsSyncService(repo, http).syncMatchStats(
            [2026],
            new RequestBudget(1),
        )

        expect(result.status).toBe('PARTIAL')
        expect([...saved.keys()]).toEqual(['f1'])
    })

    it('stops with PARTIAL when the daily quota reaches the reserve', async () => {
        const { repo } = makeRepo([
            { id: 'f1', externalId: 1, season: 2026 },
            { id: 'f2', externalId: 2, season: 2026 },
        ])
        const block = [teamBlock(10, [{ id: 101, name: 'A. Player' }])]
        const http = makeHttp({ 1: block, 2: block }, 1500)

        const result = await new MatchStatsSyncService(repo, http).syncMatchStats(
            [2026],
            new RequestBudget(50),
        )

        expect(result.status).toBe('PARTIAL')
        expect(http.get).toHaveBeenCalledTimes(1)
    })

    it('processes season 2026 before 2025', async () => {
        const { repo } = makeRepo([
            { id: 'old', externalId: 1, season: 2025 },
            { id: 'new', externalId: 2, season: 2026 },
        ])
        const block = [teamBlock(10, [{ id: 101, name: 'A. Player' }])]
        const http = makeHttp({ 1: block, 2: block })

        await new MatchStatsSyncService(repo, http).syncMatchStats([2026, 2025], new RequestBudget(10))

        expect(http.get.mock.calls.map((call) => call[1].fixture)).toEqual([2, 1])
    })
})

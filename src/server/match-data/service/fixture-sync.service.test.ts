import { describe, expect, it, vi } from 'vitest'

import { SuspiciousResponseError } from '@/server/sync/lib/errors'
import { RequestBudget } from '@/server/sync/lib/request-budget'

import { FixtureSyncService } from './fixture-sync.service'

import type { FixtureUpsert, IMatchDataRepository } from '../repository/match-data.repository.interface'

const apiFixture = (id: number, home = 10, away = 20, round = 'Regular Season - 1') => ({
    fixture: { id, date: '2026-08-21T19:00:00+00:00', status: { short: 'FT' } },
    league: { id: 39, round },
    teams: { home: { id: home }, away: { id: away } },
    goals: { home: 2, away: 1 },
})

const makeRepo = (overrides: Partial<IMatchDataRepository> = {}) => {
    const store = new Map<number, FixtureUpsert>()
    const repo = {
        findLeagueSeason: vi.fn().mockResolvedValue({ id: 'ls-1' }),
        countFixtures: vi.fn().mockResolvedValue(0),
        findTeamIdsByExternalIds: vi.fn().mockResolvedValue(
            new Map([
                [10, 'team-a'],
                [20, 'team-b'],
            ]),
        ),
        upsertFixtures: vi.fn().mockImplementation(async (rows: FixtureUpsert[]) => {
            let inserted = 0
            let updated = 0

            for (const row of rows) {
                if (store.has(row.externalId)) updated += 1
                else inserted += 1

                store.set(row.externalId, row)
            }

            return { inserted, updated }
        }),
        ...overrides,
    } as unknown as IMatchDataRepository

    return { repo, store }
}

const makeHttp = (data: unknown[], dailyRemaining: number | null = 7000) => ({
    get: vi.fn().mockResolvedValue({ data, dailyRemaining }),
})

describe('FixtureSyncService.syncFixtures', () => {
    it('throws SuspiciousResponseError and writes nothing when the response is empty', async () => {
        const { repo } = makeRepo()
        const service = new FixtureSyncService(repo, makeHttp([]))

        await expect(service.syncFixtures([2026], new RequestBudget(10))).rejects.toBeInstanceOf(
            SuspiciousResponseError,
        )
        expect(repo.upsertFixtures).not.toHaveBeenCalled()
    })

    it('throws SuspiciousResponseError when the response has fewer than half of the stored fixtures', async () => {
        const { repo } = makeRepo({ countFixtures: vi.fn().mockResolvedValue(380) })
        const service = new FixtureSyncService(repo, makeHttp([apiFixture(1)]))

        await expect(service.syncFixtures([2026], new RequestBudget(10))).rejects.toBeInstanceOf(
            SuspiciousResponseError,
        )
        expect(repo.upsertFixtures).not.toHaveBeenCalled()
    })

    it('maps API fixtures and a second identical run reports inserted 0', async () => {
        const { repo, store } = makeRepo()
        const service = new FixtureSyncService(
            repo,
            makeHttp([apiFixture(1), apiFixture(2, 20, 10, 'Regular Season - 2')]),
        )

        const first = await service.syncFixtures([2026], new RequestBudget(10))
        const second = await service.syncFixtures([2026], new RequestBudget(10))

        expect(first.stats).toMatchObject({ inserted: 2, updated: 0 })
        expect(second.stats).toMatchObject({ inserted: 0, updated: 2 })
        expect(store.get(2)).toMatchObject({
            externalId: 2,
            leagueSeasonId: 'ls-1',
            round: 'Regular Season - 2',
            roundNumber: 2,
            status: 'FT',
            homeTeamId: 'team-b',
            awayTeamId: 'team-a',
            homeGoals: 2,
            awayGoals: 1,
        })
    })

    it('never sends FPL link or stats fields to the repository', async () => {
        const { repo } = makeRepo()
        const service = new FixtureSyncService(repo, makeHttp([apiFixture(1)]))

        await service.syncFixtures([2026], new RequestBudget(10))

        const row = (repo.upsertFixtures as ReturnType<typeof vi.fn>).mock.calls[0][0][0]

        expect(Object.keys(row)).not.toEqual(
            expect.arrayContaining(['fplEvent', 'fplFixtureId', 'statsSyncedAt', 'statsAttempts']),
        )
    })

    it('fails the whole season when a team is unknown and writes nothing', async () => {
        const { repo } = makeRepo({
            findTeamIdsByExternalIds: vi.fn().mockResolvedValue(new Map([[10, 'team-a']])),
        })
        const service = new FixtureSyncService(repo, makeHttp([apiFixture(1)]))

        await expect(service.syncFixtures([2026], new RequestBudget(10))).rejects.toThrow(/20/)
        expect(repo.upsertFixtures).not.toHaveBeenCalled()
    })

    it('tells the operator to run seed-leagues when the league season is missing', async () => {
        const { repo } = makeRepo({ findLeagueSeason: vi.fn().mockResolvedValue(null) })
        const service = new FixtureSyncService(repo, makeHttp([apiFixture(1)]))

        await expect(service.syncFixtures([2026], new RequestBudget(10))).rejects.toThrow(/seed-leagues/)
    })

    it('stops with PARTIAL before the second season when the budget is exhausted', async () => {
        const { repo } = makeRepo()
        const http = makeHttp([apiFixture(1)])
        const service = new FixtureSyncService(repo, http)

        const result = await service.syncFixtures([2026, 2025], new RequestBudget(1))

        expect(result.status).toBe('PARTIAL')
        expect(http.get).toHaveBeenCalledTimes(1)
    })
})

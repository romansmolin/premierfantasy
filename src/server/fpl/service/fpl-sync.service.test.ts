import { describe, expect, it, vi } from 'vitest'

import { SuspiciousResponseError } from '@/server/sync/lib/errors'

import sample from '../lib/__fixtures__/bootstrap.sample.json'
import { FplNotFoundError } from '../lib/fpl-client'

import { FplSyncService } from './fpl-sync.service'

import type { IFplClient } from '../lib/fpl-client'
import type { FplBootstrap, FplElement, FplElementSummary, FplFixture } from '../lib/fpl.types'
import type { OurPlayer } from '../lib/player-matcher'
import type { FixtureForLinking, IFplRepository } from '../repository/fpl.repository.interface'

const base = sample as unknown as FplBootstrap
const el = (
    id: number,
    first: string,
    second: string,
    web: string,
    team: number,
    type: number,
    cost = 62,
): FplElement => ({
    id,
    code: id,
    web_name: web,
    first_name: first,
    second_name: second,
    team,
    element_type: type,
    now_cost: cost,
    status: 'a',
    chance_of_playing_next_round: null,
    news: '',
    minutes: 900,
    penalties_order: null,
})

/** 440 filler players (unmatched) plus the controlled ones, so the sanity guard passes. */
const bootstrapWith = (controlled: FplElement[]): FplBootstrap => ({
    ...base,
    elements: [
        ...controlled,
        ...Array.from({ length: 440 }, (_, i) => el(10_000 + i, 'Filler', `Player${i}`, `Player${i}`, 1, 3)),
    ],
})

const ourTeams = base.teams.map((t) => ({ id: `t-${t.id}`, name: t.name, shortName: t.short_name }))

interface RepoState {
    mappedFplIds?: number[]
    mappedPlayerIds?: string[]
    rejected?: number[]
    players?: OurPlayer[]
    storedPriceKeys?: string[]
}

const makeRepo = (state: RepoState = {}, overrides: Partial<IFplRepository> = {}) => {
    const mappings = new Map<number, string>(
        (state.mappedFplIds ?? []).map((fplId, i) => [
            fplId,
            (state.mappedPlayerIds ?? [])[i] ?? `m-${fplId}`,
        ]),
    )
    const prices = new Set<string>(state.storedPriceKeys ?? [])
    const repo = {
        saveEvents: vi.fn().mockResolvedValue(undefined),
        saveGameSettings: vi.fn().mockResolvedValue(undefined),
        findLeagueTeams: vi.fn().mockResolvedValue(ourTeams),
        setTeamFplIds: vi.fn().mockResolvedValue(undefined),
        saveAvailability: vi.fn().mockResolvedValue(undefined),
        findLeaguePlayers: vi.fn().mockResolvedValue(state.players ?? []),
        loadMappingState: vi.fn().mockImplementation(async () => ({
            mappedFplIds: new Set(mappings.keys()),
            mappedPlayerIds: new Set(mappings.values()),
            rejectedFplIds: new Set(state.rejected ?? []),
        })),
        insertAutoMappings: vi
            .fn()
            .mockImplementation(async (matches: { fplId: number; playerId: string }[]) => {
                let added = 0

                for (const m of matches) {
                    if (!mappings.has(m.fplId)) {
                        mappings.set(m.fplId, m.playerId)
                        added += 1
                    }
                }

                return added
            }),
        findFplPlayerMap: vi.fn().mockImplementation(async () => new Map(mappings)),
        upsertFplPrices: vi.fn().mockImplementation(async (_season: number, rows: { playerId: string }[]) => {
            let inserted = 0

            for (const row of rows) {
                if (!prices.has(row.playerId)) inserted += 1

                prices.add(row.playerId)
            }

            return { inserted, updated: rows.length - inserted }
        }),
        deleteNonFplPrices: vi.fn().mockResolvedValue(7),
        findFixturesForLinking: vi.fn().mockResolvedValue([]),
        setFixtureFplLinks: vi.fn().mockResolvedValue(undefined),
        findEvents: vi.fn().mockResolvedValue([]),
        findEventsWithPoints: vi.fn().mockResolvedValue(new Set<number>()),
        saveEventPoints: vi.fn().mockResolvedValue(undefined),
        findPlayersNeedingMatches: vi.fn().mockResolvedValue([]),
        savePlayerMatches: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    } as unknown as IFplRepository

    return { repo, mappings }
}

const makeClient = (overrides: Partial<IFplClient> = {}) =>
    ({
        getBootstrap: vi.fn().mockResolvedValue(bootstrapWith([])),
        getFixtures: vi.fn().mockResolvedValue([]),
        getEventLive: vi.fn().mockResolvedValue({ elements: [] }),
        getElementSummary: vi.fn().mockResolvedValue({ history: [] }),
        ...overrides,
    }) as unknown as IFplClient & {
        getBootstrap: ReturnType<typeof vi.fn>
        getEventLive: ReturnType<typeof vi.fn>
        getElementSummary: ReturnType<typeof vi.fn>
    }

describe('FplSyncService.syncBootstrap', () => {
    it('writes nothing when the bootstrap is not sane', async () => {
        const { repo } = makeRepo()
        const client = makeClient({
            getBootstrap: vi.fn().mockResolvedValue({ ...base, elements: base.elements }),
        })

        await expect(new FplSyncService(repo, client).syncBootstrap(2026)).rejects.toBeInstanceOf(
            SuspiciousResponseError,
        )
        expect(repo.saveEvents).not.toHaveBeenCalled()
        expect(repo.upsertFplPrices).not.toHaveBeenCalled()
        expect(repo.deleteNonFplPrices).not.toHaveBeenCalled()
    })

    it('fails when a team cannot be matched and writes nothing', async () => {
        const { repo } = makeRepo({}, { findLeagueTeams: vi.fn().mockResolvedValue(ourTeams.slice(1)) })

        await expect(new FplSyncService(repo, makeClient()).syncBootstrap(2026)).rejects.toThrow(/team/i)
        expect(repo.saveEvents).not.toHaveBeenCalled()
        expect(repo.setTeamFplIds).not.toHaveBeenCalled()
    })

    it('saves squad rules from game_settings and element_types', async () => {
        const { repo } = makeRepo()

        await new FplSyncService(repo, makeClient()).syncBootstrap(2026)

        expect(repo.saveGameSettings).toHaveBeenCalledWith({
            seasonYear: 2026,
            squadSize: 15,
            startingSize: 11,
            budgetTenths: 1000,
            teamLimit: 3,
            positions: [
                { position: 'GK', squadSelect: 2, minPlay: 1, maxPlay: 1 },
                { position: 'DEF', squadSelect: 5, minPlay: 3, maxPlay: 5 },
                { position: 'MID', squadSelect: 5, minPlay: 2, maxPlay: 5 },
                { position: 'FWD', squadSelect: 3, minPlay: 1, maxPlay: 3 },
            ],
        })
    })

    it('does not overwrite a MANUAL mapping or map a rejected fplId', async () => {
        const players: OurPlayer[] = [
            { id: 'p-new', name: 'Erling Haaland', position: 'FWD', teamId: 't-13' },
            { id: 'p-manual', name: 'Taken Player', position: 'FWD', teamId: 't-13' },
            { id: 'p-rej', name: 'Rejected Player', position: 'FWD', teamId: 't-13' },
        ]
        const { repo } = makeRepo({
            mappedFplIds: [2],
            mappedPlayerIds: ['p-manual'],
            rejected: [3],
            players,
        })
        const bootstrap = bootstrapWith([
            el(1, 'Erling', 'Haaland', 'Haaland', 13, 4),
            el(2, 'Taken', 'Player', 'Player', 13, 4),
            el(3, 'Rejected', 'Player', 'Player', 13, 4),
        ])

        await new FplSyncService(
            repo,
            makeClient({ getBootstrap: vi.fn().mockResolvedValue(bootstrap) }),
        ).syncBootstrap(2026)

        expect(repo.insertAutoMappings).toHaveBeenCalledWith([{ fplId: 1, playerId: 'p-new', confidence: 1 }])
    })

    it('maps unambiguous players and reports ambiguous ones without mapping them', async () => {
        const players: OurPlayer[] = [
            { id: 'g1', name: 'Gabriel', position: 'DEF', teamId: 't-1' },
            { id: 'g2', name: 'Gabriel', position: 'DEF', teamId: 't-1' },
            { id: 'ok', name: 'Erling Haaland', position: 'FWD', teamId: 't-13' },
        ]
        const { repo, mappings } = makeRepo({ players })
        const bootstrap = bootstrapWith([
            el(1, 'Gabriel', 'Magalhães', 'Gabriel', 1, 2),
            el(2, 'Erling', 'Haaland', 'Haaland', 13, 4),
        ])

        const result = await new FplSyncService(
            repo,
            makeClient({ getBootstrap: vi.fn().mockResolvedValue(bootstrap) }),
        ).syncBootstrap(2026)

        expect([...mappings.entries()]).toEqual([[2, 'ok']])
        expect(result.stats).toMatchObject({ newMappings: 1, ambiguous: 1 })
    })

    it('saves availability for every FPL player, mapped or not', async () => {
        const { repo } = makeRepo()
        const injured = {
            ...el(7, 'Hurt', 'Player', 'Player', 13, 3),
            status: 'i',
            chance_of_playing_next_round: 25,
            news: 'Knee',
        }
        const bootstrap = bootstrapWith([injured])

        await new FplSyncService(
            repo,
            makeClient({ getBootstrap: vi.fn().mockResolvedValue(bootstrap) }),
        ).syncBootstrap(2026)

        const rows = (repo.saveAvailability as ReturnType<typeof vi.fn>).mock.calls[0][0]

        expect(rows).toHaveLength(bootstrap.elements.length)
        expect(rows.find((r: { fplId: number }) => r.fplId === 7)).toEqual({
            fplId: 7,
            teamId: 't-13',
            status: 'i',
            chanceOfPlaying: 25,
            news: 'Knee',
            penaltiesOrder: null,
        })
    })

    it('saves penalties_order with the availability', async () => {
        const { repo } = makeRepo()
        const bootstrap = bootstrapWith([
            { ...el(7, 'Erling', 'Haaland', 'Haaland', 13, 4), penalties_order: 1 },
        ])

        await new FplSyncService(
            repo,
            makeClient({ getBootstrap: vi.fn().mockResolvedValue(bootstrap) }),
        ).syncBootstrap(2026)

        const rows = (repo.saveAvailability as ReturnType<typeof vi.fn>).mock.calls[0][0]

        expect(rows.find((r: { fplId: number }) => r.fplId === 7)).toMatchObject({ penaltiesOrder: 1 })
    })

    it('converts now_cost tenths to millions', async () => {
        const players: OurPlayer[] = [{ id: 'ok', name: 'Erling Haaland', position: 'FWD', teamId: 't-13' }]
        const { repo } = makeRepo({ players })
        const bootstrap = bootstrapWith([el(2, 'Erling', 'Haaland', 'Haaland', 13, 4, 62)])

        await new FplSyncService(
            repo,
            makeClient({ getBootstrap: vi.fn().mockResolvedValue(bootstrap) }),
        ).syncBootstrap(2026)

        expect(repo.upsertFplPrices).toHaveBeenCalledWith(2026, [{ playerId: 'ok', price: 6.2 }])
    })

    it('does not delete non-FPL prices when the price write fails', async () => {
        const players: OurPlayer[] = [{ id: 'ok', name: 'Erling Haaland', position: 'FWD', teamId: 't-13' }]
        const { repo } = makeRepo(
            { players },
            { upsertFplPrices: vi.fn().mockRejectedValue(new Error('db down')) },
        )
        const bootstrap = bootstrapWith([el(2, 'Erling', 'Haaland', 'Haaland', 13, 4)])

        await expect(
            new FplSyncService(
                repo,
                makeClient({ getBootstrap: vi.fn().mockResolvedValue(bootstrap) }),
            ).syncBootstrap(2026),
        ).rejects.toThrow('db down')
        expect(repo.deleteNonFplPrices).not.toHaveBeenCalled()
    })

    it('deletes non-FPL prices after a successful price write', async () => {
        const players: OurPlayer[] = [{ id: 'ok', name: 'Erling Haaland', position: 'FWD', teamId: 't-13' }]
        const { repo } = makeRepo({ players })
        const bootstrap = bootstrapWith([el(2, 'Erling', 'Haaland', 'Haaland', 13, 4)])

        const result = await new FplSyncService(
            repo,
            makeClient({ getBootstrap: vi.fn().mockResolvedValue(bootstrap) }),
        ).syncBootstrap(2026)

        expect(repo.deleteNonFplPrices).toHaveBeenCalledWith(2026)
        expect(result.stats).toMatchObject({ deletedFakePrices: 7 })
    })

    it('a second bootstrap run inserts 0 new mappings and 0 new prices', async () => {
        const players: OurPlayer[] = [{ id: 'ok', name: 'Erling Haaland', position: 'FWD', teamId: 't-13' }]
        const { repo } = makeRepo({ players })
        const bootstrap = bootstrapWith([el(2, 'Erling', 'Haaland', 'Haaland', 13, 4)])
        const service = new FplSyncService(
            repo,
            makeClient({ getBootstrap: vi.fn().mockResolvedValue(bootstrap) }),
        )

        const first = await service.syncBootstrap(2026)
        const second = await service.syncBootstrap(2026)

        expect(first.stats).toMatchObject({ newMappings: 1, pricesInserted: 1 })
        expect(second.stats).toMatchObject({ newMappings: 0, pricesInserted: 0, pricesUpdated: 1 })
    })
})

describe('FplSyncService.linkFixtures', () => {
    const ours = (id: string, kickoff: string, home: number, away: number): FixtureForLinking => ({
        id,
        kickoff: new Date(kickoff),
        homeFplTeamId: home,
        awayFplTeamId: away,
    })
    const fplFixture = (
        id: number,
        event: number | null,
        kickoff: string | null,
        h: number,
        a: number,
    ): FplFixture => ({
        id,
        event,
        kickoff_time: kickoff,
        team_h: h,
        team_a: a,
        finished: false,
    })
    const many = (extra: FplFixture[]): FplFixture[] => [
        ...extra,
        ...Array.from({ length: 120 }, (_, i) =>
            fplFixture(5000 + i, 30, '2027-05-01T14:00:00Z', 90 + i, 91 + i),
        ),
    ]

    it('gives both fixtures of a double gameweek the same fplEvent', async () => {
        const { repo } = makeRepo(
            {},
            {
                findFixturesForLinking: vi
                    .fn()
                    .mockResolvedValue([
                        ours('f1', '2026-12-26T15:00:00Z', 1, 2),
                        ours('f2', '2026-12-28T15:00:00Z', 3, 1),
                    ]),
            },
        )
        const client = makeClient({
            getFixtures: vi
                .fn()
                .mockResolvedValue(
                    many([
                        fplFixture(101, 19, '2026-12-26T15:00:00Z', 1, 2),
                        fplFixture(102, 19, '2026-12-28T15:00:00Z', 3, 1),
                    ]),
                ),
        })

        const result = await new FplSyncService(repo, client).linkFixtures(2026)

        expect(repo.setFixtureFplLinks).toHaveBeenCalledWith([
            { fixtureId: 'f1', fplFixtureId: 101, fplEvent: 19 },
            { fixtureId: 'f2', fplFixtureId: 102, fplEvent: 19 },
        ])
        expect(result.stats).toMatchObject({ linked: 2 })
    })

    it('leaves a postponed fixture without an event and does not fail', async () => {
        const { repo } = makeRepo(
            {},
            { findFixturesForLinking: vi.fn().mockResolvedValue([ours('f1', '2026-12-26T15:00:00Z', 1, 2)]) },
        )
        const client = makeClient({
            getFixtures: vi.fn().mockResolvedValue(many([fplFixture(101, null, null, 1, 2)])),
        })

        const result = await new FplSyncService(repo, client).linkFixtures(2026)

        expect(result.status).toBe('OK')
        expect(repo.setFixtureFplLinks).toHaveBeenCalledWith([
            { fixtureId: 'f1', fplFixtureId: 101, fplEvent: null },
        ])
    })

    it('does not link when the kickoff differs by more than 36 hours', async () => {
        const { repo } = makeRepo(
            {},
            { findFixturesForLinking: vi.fn().mockResolvedValue([ours('f1', '2026-12-26T15:00:00Z', 1, 2)]) },
        )
        const client = makeClient({
            getFixtures: vi.fn().mockResolvedValue(many([fplFixture(101, 19, '2026-12-30T15:00:00Z', 1, 2)])),
        })

        const result = await new FplSyncService(repo, client).linkFixtures(2026)

        expect(repo.setFixtureFplLinks).toHaveBeenCalledWith([])
        expect(result.stats).toMatchObject({ linked: 0 })
    })

    it('refuses a suspiciously short FPL fixture list', async () => {
        const { repo } = makeRepo()
        const client = makeClient({ getFixtures: vi.fn().mockResolvedValue([fplFixture(1, 1, null, 1, 2)]) })

        await expect(new FplSyncService(repo, client).linkFixtures(2026)).rejects.toBeInstanceOf(
            SuspiciousResponseError,
        )
    })
})

describe('FplSyncService.syncPoints', () => {
    const live = (n: number) => ({
        elements: Array.from({ length: 300 }, (_, i) => ({
            id: i + 1,
            stats: { total_points: n, minutes: 90 },
        })),
    })

    it('skips events already stored and always refreshes the current and previous event', async () => {
        const { repo } = makeRepo(
            {},
            {
                findEvents: vi.fn().mockResolvedValue([
                    { id: 1, finished: true, isCurrent: false },
                    { id: 2, finished: true, isCurrent: false },
                    { id: 3, finished: true, isCurrent: false },
                    { id: 4, finished: true, isCurrent: true },
                    { id: 5, finished: false, isCurrent: false },
                ]),
                findEventsWithPoints: vi.fn().mockResolvedValue(new Set([1, 2, 3, 4])),
            },
        )
        const client = makeClient({ getEventLive: vi.fn().mockResolvedValue(live(2)) })

        await new FplSyncService(repo, client).syncPoints()

        expect(client.getEventLive.mock.calls.map((c) => c[0]).sort()).toEqual([3, 4])
    })

    it('fetches finished events that have no stored points yet', async () => {
        const { repo } = makeRepo(
            {},
            {
                findEvents: vi.fn().mockResolvedValue([
                    { id: 1, finished: true, isCurrent: false },
                    { id: 2, finished: true, isCurrent: true },
                ]),
                findEventsWithPoints: vi.fn().mockResolvedValue(new Set<number>()),
            },
        )
        const client = makeClient({ getEventLive: vi.fn().mockResolvedValue(live(2)) })

        const result = await new FplSyncService(repo, client).syncPoints()

        expect(repo.saveEventPoints).toHaveBeenCalledTimes(2)
        expect(result.stats).toMatchObject({ events: 2, rows: 600 })
    })

    it('skips a 404 event', async () => {
        const { repo } = makeRepo(
            {},
            { findEvents: vi.fn().mockResolvedValue([{ id: 1, finished: true, isCurrent: true }]) },
        )
        const client = makeClient({
            getEventLive: vi.fn().mockRejectedValue(new FplNotFoundError('/event/1/live/')),
        })

        const result = await new FplSyncService(repo, client).syncPoints()

        expect(result.status).toBe('OK')
        expect(result.stats).toMatchObject({ events: 0, notFound: 1 })
    })

    it('refuses an event answer with almost no players', async () => {
        const { repo } = makeRepo(
            {},
            { findEvents: vi.fn().mockResolvedValue([{ id: 1, finished: true, isCurrent: true }]) },
        )
        const client = makeClient({ getEventLive: vi.fn().mockResolvedValue({ elements: [] }) })

        await expect(new FplSyncService(repo, client).syncPoints()).rejects.toBeInstanceOf(
            SuspiciousResponseError,
        )
        expect(repo.saveEventPoints).not.toHaveBeenCalled()
    })

    it('fails clearly when bootstrap has not run yet', async () => {
        const { repo } = makeRepo()

        await expect(new FplSyncService(repo, makeClient()).syncPoints()).rejects.toThrow(/fpl-bootstrap/)
    })
})

describe('FplSyncService.syncPlayerMatches', () => {
    const entry = (
        fixture: number,
        round: number,
        over: Partial<FplElementSummary['history'][number]> = {},
    ) => ({
        fixture,
        round,
        minutes: 90,
        starts: 1,
        goals_scored: 1,
        assists: 0,
        expected_goals: '0.45',
        expected_assists: '0.10',
        total_points: 8,
        was_home: true,
        ...over,
    })
    const savedRows = (repo: IFplRepository) =>
        (repo.savePlayerMatches as ReturnType<typeof vi.fn>).mock.calls.flatMap((call) => call[0])

    it('stores one row per fixture, two for a double gameweek', async () => {
        const { repo } = makeRepo({}, { findPlayersNeedingMatches: vi.fn().mockResolvedValue([5]) })
        const client = makeClient({
            getElementSummary: vi.fn().mockResolvedValue({ history: [entry(101, 12), entry(102, 12)] }),
        })

        await new FplSyncService(repo, client).syncPlayerMatches()

        expect(savedRows(repo)).toEqual([
            expect.objectContaining({ fplPlayerId: 5, fplFixtureId: 101, event: 12 }),
            expect.objectContaining({ fplPlayerId: 5, fplFixtureId: 102, event: 12 }),
        ])
    })

    it('parses xG strings and keeps null for unparseable', async () => {
        const { repo } = makeRepo({}, { findPlayersNeedingMatches: vi.fn().mockResolvedValue([5]) })
        const client = makeClient({
            getElementSummary: vi.fn().mockResolvedValue({
                history: [entry(1, 1), entry(2, 2, { expected_goals: '', expected_assists: 'abc' })],
            }),
        })

        await new FplSyncService(repo, client).syncPlayerMatches()

        const rows = savedRows(repo)

        expect(rows[0]).toMatchObject({
            xg: 0.45,
            xa: 0.1,
            goals: 1,
            assists: 0,
            starts: 1,
            minutes: 90,
            totalPoints: 8,
            wasHome: true,
        })
        expect(rows[1]).toMatchObject({ xg: null, xa: null })
    })

    it('skips a player whose summary fails and stores nothing for them', async () => {
        const { repo } = makeRepo({}, { findPlayersNeedingMatches: vi.fn().mockResolvedValue([1, 2]) })
        const client = makeClient({
            getElementSummary: vi.fn().mockImplementation(async (id: number) => {
                if (id === 2) throw new Error('boom')

                return { history: [entry(101, 12)] }
            }),
        })

        const result = await new FplSyncService(repo, client).syncPlayerMatches()

        expect(savedRows(repo).map((r: { fplPlayerId: number }) => r.fplPlayerId)).toEqual([1])
        expect(result.stats).toMatchObject({ players: 1, failed: 1, rows: 1 })
    })

    it('throws SuspiciousResponseError when more than half of the attempted players fail', async () => {
        const { repo } = makeRepo({}, { findPlayersNeedingMatches: vi.fn().mockResolvedValue([1, 2, 3, 4]) })
        const client = makeClient({
            getElementSummary: vi.fn().mockImplementation(async (id: number) => {
                if (id !== 1) throw new Error('boom')

                return { history: [entry(101, 12)] }
            }),
        })

        await expect(new FplSyncService(repo, client).syncPlayerMatches()).rejects.toBeInstanceOf(
            SuspiciousResponseError,
        )
    })

    it('passes maxPlayers to the repository and resumes where it stopped', async () => {
        const find = vi.fn().mockResolvedValue([])
        const { repo } = makeRepo({}, { findPlayersNeedingMatches: find })

        await new FplSyncService(repo, makeClient()).syncPlayerMatches(40)

        expect(find).toHaveBeenCalledWith(40, expect.any(Date))
    })
})

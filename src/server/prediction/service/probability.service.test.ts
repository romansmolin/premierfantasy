import { describe, expect, it, vi } from 'vitest'

import { MODEL_VERSION_V2 } from '../lib/v2/params'

import { ProbabilityService } from './probability.service'

import type { DatasetFixture, ForecastDataset, StoredMatch } from '../lib/inputs'
import type { ProbabilityEvaluation } from '../lib/v2/evaluation'
import type { IForecastDataRepository } from '../repository/forecast-data.repository.interface'
import type {
    IProbabilityRepository,
    PlayerMatchProbability,
} from '../repository/probability.repository.interface'

const failing = vi.hoisted(() => ({ evaluation: false }))

vi.mock('../lib/v2/evaluation', async (importOriginal) => {
    const original = await importOriginal<typeof import('../lib/v2/evaluation')>()

    return {
        ...original,
        evaluateProbabilities: (...args: Parameters<typeof original.evaluateProbabilities>) => {
            if (failing.evaluation) throw new Error('evaluation boom')

            return original.evaluateProbabilities(...args)
        },
    }
})

const day = (d: number) => new Date(Date.UTC(2026, 7, 1 + d))
const NOW = day(20)

/** Three finished events of A v B, then `upcoming` fixtures (fixtureId, event, day offset, home team). */
function dataset(upcoming: [string, number, number, string][], withNext = true): ForecastDataset {
    const finished: DatasetFixture[] = [1, 2, 3].map((e) => ({
        fixtureId: `f${e}`,
        kickoff: day(e * 7 - 7),
        homeTeamId: 'A',
        awayTeamId: 'B',
        homeGoals: 1,
        awayGoals: 1,
        fplEvent: e,
        status: 'FT',
    }))
    const ahead: DatasetFixture[] = upcoming.map(([fixtureId, fplEvent, offset, home]) => ({
        fixtureId,
        kickoff: day(offset),
        homeTeamId: home,
        awayTeamId: home === 'A' ? 'B' : 'A',
        homeGoals: null,
        awayGoals: null,
        fplEvent,
        status: 'NS',
    }))
    const matches: StoredMatch[] = [1, 2, 3].flatMap((e) =>
        ['p1', 'p2'].map((playerId) => ({
            kickoff: day(e * 7 - 7),
            fixtureId: `f${e}`,
            teamId: 'A',
            playerId,
            minutes: 90,
            goals: 0,
            assists: 0,
            saves: 0,
            yellowCards: 0,
            redCards: 0,
            tackles: 2,
            blocks: 1,
            interceptions: 1,
            isStarter: true,
            position: 'MID' as const,
        })),
    )

    return {
        matches,
        fixtures: [...finished, ...ahead],
        players: [
            { playerId: 'p1', fplId: 1, position: 'MID', currentTeamId: 'A' },
            { playerId: 'p2', fplId: 2, position: 'MID', currentTeamId: 'A' },
            // Cold start: no appearances at all.
            { playerId: 'p3', fplId: 3, position: 'FWD', currentTeamId: 'A' },
        ],
        fplPoints: new Map(),
        fplMatches: new Map(),
        availability: new Map(),
        events: [
            { id: 1, finished: true, isNext: false, isCurrent: false },
            { id: 2, finished: true, isNext: false, isCurrent: false },
            { id: 3, finished: true, isNext: false, isCurrent: true },
            ...[4, 5, 6, 7, 8, 9, 10, 11, 12].map((id) => ({
                id,
                finished: false,
                isNext: withNext && id === 4,
                isCurrent: false,
            })),
        ],
    }
}

const SEVEN = [4, 5, 6, 7, 8, 9, 10].map((e): [string, number, number, string] => [
    `u${e}`,
    e,
    e * 7,
    e % 2 === 0 ? 'A' : 'B',
])

const stored = (pointsMeanPassed: boolean | null): (ProbabilityEvaluation & { createdAt: Date }) | null =>
    pointsMeanPassed === null
        ? null
        : {
              modelVersion: MODEL_VERSION_V2,
              eventsEvaluated: 9,
              gates: [],
              pointsMean: {
                  passed: pointsMeanPassed,
                  maeV2: 1,
                  maeV1: 1,
                  rankCorrV2: 0.5,
                  rankCorrV1: 0.5,
                  n: 400,
                  reasons: [],
              },
              calibration: {
                  GK: { intercept: 0, slope: 1 },
                  DEF: { intercept: 0, slope: 1 },
                  MID: { intercept: 0, slope: 1 },
                  FWD: { intercept: 0, slope: 1 },
              },
              createdAt: new Date('2026-11-15T00:00:00Z'),
          }

const make = (ds: ForecastDataset, latest: ReturnType<typeof stored> = null) => {
    const dataRepo = { loadDataset: vi.fn().mockResolvedValue(ds) } satisfies IForecastDataRepository
    const repo = {
        saveEvaluation: vi.fn().mockResolvedValue(undefined),
        findLatestEvaluation: vi.fn().mockResolvedValue(latest),
        replaceMatchProbabilities: vi.fn().mockResolvedValue(undefined),
        replaceFixtureProbabilities: vi.fn().mockResolvedValue(undefined),
        findMatchProbabilities: vi.fn().mockResolvedValue([]),
        findFixtureProbabilities: vi.fn().mockResolvedValue([]),
        findLatestUpdate: vi.fn().mockResolvedValue(null),
    } satisfies IProbabilityRepository

    return { service: new ProbabilityService(dataRepo, repo, () => NOW), repo }
}

const matchRows = (repo: ReturnType<typeof make>['repo']): PlayerMatchProbability[] =>
    (repo.replaceMatchProbabilities as ReturnType<typeof vi.fn>).mock.calls[0][0]

describe('ProbabilityService.run', () => {
    it('stores at most 5 matches per player', async () => {
        const { service, repo } = make(dataset(SEVEN))

        const result = await service.run()
        const rows = matchRows(repo)

        expect(result.status).toBe('OK')
        expect(rows.filter((r) => r.playerId === 'p1').map((r) => r.horizon)).toEqual([1, 2, 3, 4, 5])
        expect(rows.every((r) => r.pointsBuckets.length === 4)).toBe(true)
        // The cold-start player gets no rows.
        expect(rows.some((r) => r.playerId === 'p3')).toBe(false)
    })

    it('stores two rows for a double gameweek', async () => {
        const { service, repo } = make(
            dataset([
                ['d1', 4, 28, 'A'],
                ['d2', 4, 30, 'B'],
            ]),
        )

        await service.run()

        const rows = matchRows(repo).filter((r) => r.playerId === 'p1')

        expect(rows.map((r) => r.fixtureId)).toEqual(['d1', 'd2'])
        expect(rows.map((r) => r.horizon)).toEqual([1, 2])
    })

    it('stores outcomes of future fixtures in the next 8 events only', async () => {
        const { service, repo } = make(dataset([...SEVEN, ['far', 12, 90, 'A']]))

        await service.run()

        const rows = (repo.replaceFixtureProbabilities as ReturnType<typeof vi.fn>).mock.calls[0][0]

        expect(rows.map((r: { fixtureId: string }) => r.fixtureId)).toEqual(
            expect.arrayContaining(['u4', 'u10']),
        )
        expect(rows.some((r: { fixtureId: string }) => r.fixtureId === 'far')).toBe(false)
        expect(rows[0].pHome + rows[0].pDraw + rows[0].pAway).toBeCloseTo(1, 6)
        expect(rows[0].xgHome).toBeGreaterThan(0)
        expect(rows[0].leagueGoals).toBeGreaterThan(0)
    })

    it('skips fixtures whose kickoff has passed', async () => {
        // Event 4 started (cutoff in the past) but one of its matches is still ahead.
        const { service, repo } = make(
            dataset([
                ['past', 4, 12, 'A'],
                ['ahead', 4, 24, 'B'],
            ]),
        )

        await service.run()

        const rows = (repo.replaceFixtureProbabilities as ReturnType<typeof vi.fn>).mock.calls[0][0]

        expect(rows.map((r: { fixtureId: string }) => r.fixtureId)).toEqual(['ahead'])
    })

    it('no upcoming event stores nothing and returns OK', async () => {
        const ds = dataset([])

        ds.events = ds.events.filter((e) => e.finished)

        const { service, repo } = make(ds)
        const result = await service.run()

        expect(result.status).toBe('OK')
        expect(result.stats.matchProbabilities).toBe(0)
        expect(repo.replaceMatchProbabilities).not.toHaveBeenCalled()
        expect(repo.replaceFixtureProbabilities).not.toHaveBeenCalled()
    })

    it('evaluation is saved before predictions', async () => {
        const { service, repo } = make(dataset(SEVEN))

        await service.run()

        const saved = (repo.saveEvaluation as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]
        const replaced = (repo.replaceMatchProbabilities as ReturnType<typeof vi.fn>).mock
            .invocationCallOrder[0]

        expect(saved).toBeLessThan(replaced)
        expect((repo.saveEvaluation as ReturnType<typeof vi.fn>).mock.calls[0][0].modelVersion).toBe(
            MODEL_VERSION_V2,
        )
    })

    it('a failing evaluation keeps the old predictions', async () => {
        failing.evaluation = true

        try {
            const { service, repo } = make(dataset(SEVEN))

            await expect(service.run()).rejects.toThrow('evaluation boom')
            expect(repo.saveEvaluation).not.toHaveBeenCalled()
            expect(repo.replaceMatchProbabilities).not.toHaveBeenCalled()
            expect(repo.replaceFixtureProbabilities).not.toHaveBeenCalled()
        } finally {
            failing.evaluation = false
        }
    })

    it('fails with a clear message when no FPL events are stored', async () => {
        const ds = dataset(SEVEN)

        ds.events = []

        await expect(make(ds).service.run()).rejects.toThrow(/fpl-bootstrap/)
    })
})

describe('ProbabilityService.getStatus', () => {
    it('reports pointsMeanOn from the latest evaluation and false without one', async () => {
        const on = await make(dataset(SEVEN), stored(true)).service.getStatus()
        const off = await make(dataset(SEVEN), stored(false)).service.getStatus()
        const none = await make(dataset(SEVEN), null).service.getStatus()

        expect(on).toMatchObject({ pointsMeanOn: true, eventsEvaluated: 9, gates: [] })
        expect(on.evaluatedAt).toEqual(new Date('2026-11-15T00:00:00Z'))
        expect(off.pointsMeanOn).toBe(false)
        expect(none).toEqual({
            evaluatedAt: null,
            eventsEvaluated: 0,
            gates: [],
            pointsMeanOn: false,
            updatedAt: null,
        })
    })

    it('updatedAt is the newest stored match row time, not the evaluation time', async () => {
        const { service, repo } = make(dataset(SEVEN), stored(true))
        const rowsAt = new Date('2026-11-10T00:00:00Z')

        repo.findLatestUpdate.mockResolvedValue(rowsAt)

        const status = await service.getStatus()

        expect(status.updatedAt).toEqual(rowsAt)
        expect(status.evaluatedAt).toEqual(new Date('2026-11-15T00:00:00Z'))
    })

    it('updatedAt is null when no rows are stored', async () => {
        const { service } = make(dataset(SEVEN), stored(true))

        expect((await service.getStatus()).updatedAt).toBeNull()
    })
})

describe('ProbabilityService readers', () => {
    it('keys the horizon-1 rows by player', async () => {
        const { service, repo } = make(dataset(SEVEN))
        const row = (playerId: string, horizon: number) => ({
            fixtureId: `${playerId}${horizon}`,
            playerId,
            horizon,
            pGoal: 0.1,
            pAssist: 0.1,
            pStart: 0.9,
            expectedMinutes: 80,
            expectedPoints: 4,
            pointsBuckets: [0.3, 0.4, 0.2, 0.1],
            createdAt: NOW,
        })

        repo.findMatchProbabilities.mockResolvedValue([row('p1', 1), row('p1', 2), row('p2', 1)])

        const map = await service.getNextMatchForAll()

        expect([...map.keys()].sort()).toEqual(['p1', 'p2'])
        expect(map.get('p1')?.horizon).toBe(1)
    })
})

import { describe, expect, it, vi } from 'vitest'

import { MODEL_VERSION } from '../lib/model'

import { ForecastService } from './forecast.service'

import type { Evaluation } from '../lib/evaluation'
import type { DatasetFixture, ForecastDataset, StoredMatch } from '../lib/inputs'
import type { IForecastDataRepository } from '../repository/forecast-data.repository.interface'
import type { IForecastRepository } from '../repository/forecast.repository.interface'

const day = (d: number) => new Date(Date.UTC(2026, 7, 1 + d))

function dataset(overrides: Partial<ForecastDataset> = {}): ForecastDataset {
    const fixtures: DatasetFixture[] = [
        ...[1, 2, 3].map((e) => ({
            fixtureId: `f${e}`,
            kickoff: day(e * 7),
            homeTeamId: 'A',
            awayTeamId: 'B',
            homeGoals: 1,
            awayGoals: 1,
            fplEvent: e,
            status: 'FT',
        })),
        {
            fixtureId: 'f4',
            kickoff: day(28),
            homeTeamId: 'A',
            awayTeamId: 'B',
            homeGoals: null,
            awayGoals: null,
            fplEvent: 4,
            status: 'NS',
        },
    ]
    const matches: StoredMatch[] = [1, 2, 3].map((e) => ({
        kickoff: day(e * 7),
        fixtureId: `f${e}`,
        teamId: 'A',
        playerId: 'p1',
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
        position: 'MID',
    }))

    return {
        matches,
        fixtures,
        players: [{ playerId: 'p1', fplId: 1, position: 'MID', currentTeamId: 'A' }],
        fplPoints: new Map([
            [
                'p1',
                new Map([
                    [1, { totalPoints: 3, minutes: 90 }],
                    [2, { totalPoints: 3, minutes: 90 }],
                    [3, { totalPoints: 3, minutes: 90 }],
                ]),
            ],
        ]),
        fplMatches: new Map(),
        availability: new Map(),
        events: [
            { id: 1, finished: true, isNext: false, isCurrent: false },
            { id: 2, finished: true, isNext: false, isCurrent: false },
            { id: 3, finished: true, isNext: false, isCurrent: true },
            { id: 4, finished: false, isNext: true, isCurrent: false },
        ],
        ...overrides,
    }
}

const make = (
    ds: ForecastDataset,
    latest: (Evaluation & { createdAt: Date }) | null = null,
    predictions = 600,
) => {
    const dataRepo = { loadDataset: vi.fn().mockResolvedValue(ds) } satisfies IForecastDataRepository
    const repo = {
        saveEvaluation: vi.fn().mockResolvedValue(undefined),
        replacePredictions: vi.fn().mockResolvedValue(undefined),
        findLatestEvaluation: vi.fn().mockResolvedValue(latest),
        findNextEventId: vi.fn().mockResolvedValue(4),
        countPredictions: vi.fn().mockResolvedValue(predictions),
    } satisfies IForecastRepository

    return { service: new ForecastService(dataRepo, repo), repo }
}

const evaluation = (passed: boolean): Evaluation & { createdAt: Date } => ({
    modelVersion: MODEL_VERSION,
    eventsEvaluated: 10,
    playerEvents: 900,
    mae: 1,
    baselineMae: 2,
    rankCorr: 0.5,
    baselineRankCorr: 0.2,
    passed,
    reasons: [],
    details: {},
    createdAt: new Date(),
})

describe('ForecastService.run', () => {
    it('stores an evaluation and predictions for the next event', async () => {
        const { service, repo } = make(dataset())

        const result = await service.run()

        expect(result.status).toBe('OK')
        expect(repo.saveEvaluation).toHaveBeenCalledTimes(1)

        const [event, version, rows] = (repo.replacePredictions as ReturnType<typeof vi.fn>).mock.calls[0]

        expect(event).toBe(4)
        expect(version).toBe(MODEL_VERSION)
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ playerId: 'p1' })
        expect(rows[0].expectedPoints).toBeGreaterThan(0)
    })

    it('stores predictions even when the bar failed and reports passed 0', async () => {
        const { service, repo } = make(dataset())

        const result = await service.run()

        expect(result.stats.passed).toBe(0)
        expect(repo.replacePredictions).toHaveBeenCalled()
    })

    it('fails with a clear message when no FPL events are stored', async () => {
        const { service } = make(dataset({ events: [] }))

        await expect(service.run()).rejects.toThrow(/fpl-bootstrap/)
    })

    it('is a successful no-op when there is no upcoming event (end of season)', async () => {
        const ds = dataset({
            events: dataset().events.filter((e) => e.id !== 4),
            fixtures: dataset().fixtures.filter((f) => f.fplEvent !== 4),
        })
        const { service, repo } = make(ds)
        const result = await service.run()

        expect(result.status).toBe('OK')
        expect(result.stats.predictions).toBe(0)
        expect(repo.replacePredictions).not.toHaveBeenCalled()
    })

    it('predicts 0 for an unavailable player', async () => {
        const { service, repo } = make(
            dataset({ availability: new Map([['p1', { status: 'i', chanceOfPlaying: 0 }]]) }),
        )

        await service.run()

        const rows = (repo.replacePredictions as ReturnType<typeof vi.fn>).mock.calls[0][2]

        expect(rows[0].expectedPoints).toBe(0)
        expect(rows[0].expectedMinutes).toBe(0)
    })
})

describe('ForecastService.getStatus', () => {
    it('is enabled only when the latest evaluation passed', async () => {
        expect((await make(dataset(), evaluation(true)).service.getStatus()).enabled).toBe(true)
        expect((await make(dataset(), evaluation(false)).service.getStatus()).enabled).toBe(false)
    })

    it('is disabled while the next event has no predictions, even if the bar was passed', async () => {
        const status = await make(dataset(), evaluation(true), 0).service.getStatus()

        expect(status.enabled).toBe(false)
        expect(status.nextEvent).toBe(4)
    })

    it('is disabled when there is no evaluation yet', async () => {
        const status = await make(dataset(), null).service.getStatus()

        expect(status.enabled).toBe(false)
        expect(status.evaluation).toBeNull()
    })
})

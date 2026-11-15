import { describe, expect, it } from 'vitest'

import { baselineFor, evaluateWalkForward, fitCalibration, passesBar } from './evaluation'

import type { DatasetFixture, ForecastDataset, StoredMatch } from './inputs'

const good = {
    eventsEvaluated: 10,
    playerEvents: 2000,
    mae: 1.5,
    baselineMae: 1.8,
    rankCorr: 0.4,
    baselineRankCorr: 0.3,
}

describe('passesBar', () => {
    it('passes when the model wins on both metrics with enough data', () => {
        expect(passesBar(good)).toEqual({ passed: true, reasons: [] })
    })

    it.each([
        ['MAE not better', { mae: 1.9 }],
        ['rank correlation not better', { rankCorr: 0.3 }],
        ['too few events', { eventsEvaluated: 7 }],
        ['too few player-events', { playerEvents: 499 }],
    ])('fails alone when %s', (_label, change) => {
        const result = passesBar({ ...good, ...change })

        expect(result.passed).toBe(false)
        expect(result.reasons).toHaveLength(1)
    })

    it('lists every failed condition', () => {
        const result = passesBar({ ...good, mae: 9, rankCorr: -1, eventsEvaluated: 1, playerEvents: 1 })

        expect(result.reasons).toHaveLength(4)
    })
})

describe('fitCalibration', () => {
    const rows = (n: number) =>
        Array.from({ length: n }, (_, i) => ({
            position: 'MID' as const,
            raw: i % 10,
            actual: 2 * (i % 10) + 1,
        }))

    it('recovers a line when there are enough rows', () => {
        const fit = fitCalibration(rows(300))

        expect(fit.MID.slope).toBeCloseTo(1.5, 9) // clamped from 2
        expect(fit.MID.intercept).toBeGreaterThan(1)
    })

    it('returns identity below minRows and for positions without rows', () => {
        const fit = fitCalibration(rows(50))

        expect(fit.MID).toEqual({ intercept: 0, slope: 1 })
        expect(fit.GK).toEqual({ intercept: 0, slope: 1 })
    })

    it('keeps an exact slope inside the clamp', () => {
        const fit = fitCalibration(
            Array.from({ length: 300 }, (_, i) => ({
                position: 'DEF' as const,
                raw: i % 10,
                actual: 1.2 * (i % 10) + 0.5,
            })),
        )

        expect(fit.DEF.slope).toBeCloseTo(1.2, 9)
        expect(fit.DEF.intercept).toBeCloseTo(0.5, 9)
    })
})

describe('baselineFor', () => {
    const points = new Map(
        [1, 2, 3, 4, 5, 6, 7].map((e) => [e, { totalPoints: e === 4 ? 0 : e, minutes: e === 4 ? 0 : 90 }]),
    )

    it('averages the last 5 appearances before the event and ignores that event and later ones', () => {
        // before event 7: events 6,5,3,2,1 (event 4 has 0 minutes) -> (6+5+3+2+1)/5
        expect(baselineFor(points, 7)).toBeCloseTo(17 / 5, 12)
        expect(baselineFor(points, 2)).toBe(1)
    })

    it('is null without a prior appearance', () => {
        expect(baselineFor(points, 1)).toBeNull()
    })
})

const day = (d: number) => new Date(Date.UTC(2026, 7, 1 + d))

/** 12 events; A-B and C-D play every event; players p1 (A), p2 (B) always play, p3 (C) never, p4 (team E) has no fixtures. */
function world(events: number): ForecastDataset {
    const fixtures: DatasetFixture[] = []
    const matches: StoredMatch[] = []
    const fplPoints: ForecastDataset['fplPoints'] = new Map([
        ['p1', new Map()],
        ['p2', new Map()],
        ['p3', new Map()],
        ['p4', new Map()],
    ])

    for (let e = 1; e <= events; e += 1) {
        for (const [home, away, suffix] of [
            ['A', 'B', 'ab'],
            ['C', 'D', 'cd'],
        ] as const) {
            fixtures.push({
                fixtureId: `f${e}${suffix}`,
                kickoff: day(e * 7),
                homeTeamId: home,
                awayTeamId: away,
                homeGoals: 1,
                awayGoals: 1,
                fplEvent: e,
                status: 'FT',
            })
        }

        for (const [pid, team] of [
            ['p1', 'A'],
            ['p2', 'B'],
            ['p4', 'E'],
        ] as const) {
            matches.push({
                kickoff: day(e * 7),
                fixtureId: `f${e}${team === 'A' || team === 'B' ? 'ab' : 'cd'}`,
                teamId: team,
                playerId: pid,
                minutes: 90,
                goals: 0,
                assists: 0,
                saves: 0,
                yellowCards: 0,
                redCards: 0,
                tackles: 2,
                blocks: 1,
                interceptions: 1,
                position: 'MID',
            })
        }

        for (const pid of ['p1', 'p2', 'p3', 'p4']) {
            fplPoints.get(pid)?.set(e, { totalPoints: 3, minutes: pid === 'p3' ? 0 : 90 })
        }
    }

    return {
        matches,
        fixtures,
        players: [
            { playerId: 'p1', fplId: 1, position: 'MID', currentTeamId: 'A' },
            { playerId: 'p2', fplId: 2, position: 'MID', currentTeamId: 'B' },
            { playerId: 'p3', fplId: 3, position: 'MID', currentTeamId: 'C' },
            { playerId: 'p4', fplId: 4, position: 'MID', currentTeamId: 'E' },
        ],
        fplPoints,
        availability: new Map(),
        events: Array.from({ length: events }, (_, i) => ({
            id: i + 1,
            finished: true,
            isNext: false,
            isCurrent: false,
        })),
    }
}

describe('evaluateWalkForward', () => {
    it('with fewer than 8 finished events reports passed false with reasons and does not throw', () => {
        const { evaluation } = evaluateWalkForward(world(3))

        expect(evaluation.passed).toBe(false)
        expect(evaluation.reasons.length).toBeGreaterThan(0)
    })

    it('does not evaluate players expected under 30 minutes or without fixtures', () => {
        const { evaluation } = evaluateWalkForward(world(12), { lastEvents: 10 })

        // only p1 and p2 qualify; the first of the 10 events has no prior FPL appearance for the baseline
        expect(evaluation.playerEvents).toBeLessThanOrEqual(2 * 10)
        expect(evaluation.playerEvents).toBeGreaterThan(0)
        expect(evaluation.eventsEvaluated).toBeGreaterThan(0)
    })

    it('an enormous actual score in the evaluated event does not change the baseline of that event', () => {
        const a = world(12)
        const b = world(12)

        b.fplPoints.get('p1')?.set(12, { totalPoints: 1000, minutes: 90 })

        const baselineA = baselineFor(
            a.fplPoints.get('p1') as Map<number, { totalPoints: number; minutes: number }>,
            12,
        )
        const baselineB = baselineFor(
            b.fplPoints.get('p1') as Map<number, { totalPoints: number; minutes: number }>,
            12,
        )

        expect(baselineB).toBe(baselineA)
    })

    it('returns an identity calibration when there is too little data to fit one', () => {
        const { calibration } = evaluateWalkForward(world(12))

        expect(calibration.MID).toEqual({ intercept: 0, slope: 1 })
    })
})

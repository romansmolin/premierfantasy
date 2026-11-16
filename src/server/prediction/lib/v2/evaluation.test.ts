import { describe, expect, it } from 'vitest'

import { evaluateProbabilities, isGateOn, passesGate, scoreEvents } from './evaluation'

import type { DatasetFixture, ForecastDataset, FplMatchRow, StoredMatch } from '../inputs'
import type { GateResult, Scored } from './evaluation'

const good = {
    n: 1000,
    brier: 0.1,
    baselineBrier: 0.12,
    buckets: [
        { lo: 0, hi: 0.1, n: 500, predicted: 0.05, observed: 0.06 },
        { lo: 0.3, hi: 0.4, n: 500, predicted: 0.35, observed: 0.33 },
    ],
}

describe('passesGate', () => {
    it('passes with enough events, a Brier edge and calibrated buckets', () => {
        expect(passesGate(good, 10)).toEqual({ passed: true, reasons: [] })
    })

    it('passesGate fails with fewer than 8 events', () => {
        const result = passesGate(good, 7)

        expect(result.passed).toBe(false)
        expect(result.reasons.join(' ')).toContain('8')
    })

    it('passesGate fails when Brier is not better than baseline by minBrierEdge', () => {
        expect(passesGate({ ...good, brier: 0.1195 }, 10).passed).toBe(false)
        expect(passesGate({ ...good, brier: 0.12 }, 10).passed).toBe(false)
    })

    it('passesGate fails when a bucket with n ≥ 30 is more than 0.07 off, even if Brier is better', () => {
        const buckets = [...good.buckets, { lo: 0.5, hi: 0.6, n: 30, predicted: 0.55, observed: 0.45 }]
        const result = passesGate({ ...good, buckets }, 10)

        expect(result.passed).toBe(false)
        expect(result.reasons).toHaveLength(1)
    })

    it('passesGate ignores a badly off bucket with n < 30', () => {
        const buckets = [...good.buckets, { lo: 0.5, hi: 0.6, n: 29, predicted: 0.55, observed: 0 }]

        expect(passesGate({ ...good, buckets }, 10).passed).toBe(true)
    })
})

describe('isGateOn', () => {
    const gate = (passed: boolean, position: GateResult['position']): GateResult => ({
        metric: 'goal',
        horizon: 'next',
        position,
        n: 0,
        brier: 0,
        baselineBrier: 0,
        buckets: [],
        passed,
        reasons: [],
    })

    it('isGateOn is false for a missing gate and for a failed one, true for a passed one', () => {
        const gates = [gate(true, 'MID'), gate(false, 'DEF'), gate(true, 'ALL')]

        expect(isGateOn(gates, 'goal', 'next', 'MID')).toBe(true)
        expect(isGateOn(gates, 'goal', 'next', 'DEF')).toBe(false)
        expect(isGateOn(gates, 'goal', 'next', 'FWD')).toBe(false)
        expect(isGateOn(gates, 'goal', 'later', 'MID')).toBe(false)
        expect(isGateOn(gates, 'assist', 'next', 'MID')).toBe(false)
        expect(isGateOn(gates, 'goal', 'next')).toBe(true)
    })
})

const day = (d: number) => new Date(Date.UTC(2026, 7, 1 + d))
const fixtureId = (e: number) => `f${e}`

/** A plays B every event (A at home on odd events); p1 is in A, p2 in B; goals vary by event. */
function world(events: number, fplFor: (player: string, e: number) => boolean): ForecastDataset {
    const fixtures: DatasetFixture[] = []
    const matches: StoredMatch[] = []
    const fplMatches = new Map<string, FplMatchRow[]>([
        ['p1', []],
        ['p2', []],
    ])

    for (let e = 1; e <= events; e += 1) {
        const aHome = e % 2 === 1

        fixtures.push({
            fixtureId: fixtureId(e),
            kickoff: day(e * 7),
            homeTeamId: aHome ? 'A' : 'B',
            awayTeamId: aHome ? 'B' : 'A',
            homeGoals: e % 3,
            awayGoals: (e + 1) % 2,
            fplEvent: e,
            status: 'FT',
        })

        for (const [pid, team] of [
            ['p1', 'A'],
            ['p2', 'B'],
        ] as const) {
            const goals = (e + (pid === 'p1' ? 0 : 1)) % 3 === 0 ? 1 : 0
            const assists = e % 4 === 0 ? 1 : 0

            matches.push({
                kickoff: day(e * 7),
                fixtureId: fixtureId(e),
                teamId: team,
                playerId: pid,
                minutes: 90,
                goals,
                assists,
                saves: 0,
                yellowCards: 0,
                redCards: 0,
                tackles: 2,
                blocks: 1,
                interceptions: 1,
                isStarter: e % 5 !== 0,
                position: 'MID',
            })

            if (fplFor(pid, e)) {
                fplMatches.get(pid)?.push({
                    fixtureId: fixtureId(e),
                    event: e,
                    minutes: 90,
                    started: e % 5 !== 0,
                    goals,
                    assists,
                    xg: 0.3,
                    xa: 0.1,
                    totalPoints: 2 + 5 * goals + 3 * assists,
                    wasHome: team === 'A' ? aHome : !aHome,
                })
            }
        }
    }

    return {
        matches,
        fixtures,
        players: [
            { playerId: 'p1', fplId: 1, position: 'MID', currentTeamId: 'A' },
            { playerId: 'p2', fplId: 2, position: 'MID', currentTeamId: 'B' },
        ],
        fplPoints: new Map(),
        fplMatches,
        availability: new Map(),
        events: Array.from({ length: events }, (_, i) => ({
            id: i + 1,
            finished: true,
            isNext: false,
            isCurrent: false,
        })),
    }
}

const playerGates = (gates: GateResult[]) => gates.filter((g) => g.metric !== 'outcome')

describe('evaluateProbabilities', () => {
    it('evaluateProbabilities skips a record when the FPL row is missing instead of counting a non-goal', () => {
        // p1 has rich FPL history but no row for event 8; p2 has only the event 8 row (too little history).
        const data = world(8, (pid, e) => (pid === 'p1' ? e < 8 : e === 8))
        const result = evaluateProbabilities(data, { lastEvents: 1 })

        expect(playerGates(result.gates).length).toBeGreaterThan(0)

        for (const g of playerGates(result.gates)) expect(g.n).toBe(0)

        expect(result.gates.some((g) => g.passed)).toBe(false)
    })

    it('evaluateProbabilities uses only data before each event', () => {
        const a = world(12, () => true)
        const b = world(12, () => true)
        const last = b.fixtures.find((f) => f.fixtureId === fixtureId(12)) as DatasetFixture

        // Event 12's result and player lines change; its FPL rows (the actuals) do not.
        last.homeGoals = 7
        last.awayGoals = 0

        for (const m of b.matches.filter((x) => x.fixtureId === fixtureId(12))) {
            m.goals = 4
            m.minutes = 10
        }

        const ra = evaluateProbabilities(a, { lastEvents: 3 })
        const rb = evaluateProbabilities(b, { lastEvents: 3 })

        expect(playerGates(ra.gates).some((g) => g.n > 0)).toBe(true)
        expect(playerGates(rb.gates)).toEqual(playerGates(ra.gates))
        expect(ra.eventsEvaluated).toBe(3)
    })
})

/** Everything played at or after `from`: FPL rows, fixture scores and match lines all change. */
function mutateFrom(data: ForecastDataset, from: Date): void {
    const later = new Set(data.fixtures.filter((f) => f.kickoff >= from).map((f) => f.fixtureId))

    for (const f of data.fixtures.filter((x) => later.has(x.fixtureId))) {
        f.homeGoals = 6
        f.awayGoals = 0
    }

    for (const m of data.matches.filter((x) => later.has(x.fixtureId))) {
        m.goals = 3
        m.minutes = 15
        m.isStarter = false
    }

    for (const rows of data.fplMatches.values()) {
        for (const r of rows.filter((x) => later.has(x.fixtureId))) {
            r.totalPoints += 10
            r.goals = 3
            r.xg = 2.5
            r.started = !r.started
        }
    }
}

const N = 8
const cutoffAfterN = day((N + 1) * 7)
const predictions = (rows: Scored[]) =>
    rows.map(({ metric, horizon, position, p, base }) => ({ metric, horizon, position, p, base }))
const ofEvent = (data: ForecastDataset, metric: (m: Scored['metric']) => boolean) =>
    scoreEvents(data, { calibrationMinRows: 1 }).scored.filter((r) => r.event === N && metric(r.metric))

describe('scoreEvents leakage', () => {
    it('event N player predictions and baselines ignore everything played after event N + 1 starts', () => {
        // Guards FPL-row leaks into the baseline history and v2 inputs (xG), and match-line leaks into inputs.
        const a = world(12, () => true)
        const b = world(12, () => true)

        mutateFrom(b, cutoffAfterN)

        const ra = ofEvent(a, (m) => m !== 'outcome')
        const rb = ofEvent(b, (m) => m !== 'outcome')

        expect(ra.some((r) => r.horizon === 'later')).toBe(true)
        expect(predictions(rb)).toEqual(predictions(ra))
        // The mutation does reach these records: their later-match actuals changed.
        expect(rb.map((r) => r.actual)).not.toEqual(ra.map((r) => r.actual))
    })

    it('event N calibration ignores later FPL rows and follows earlier ones', () => {
        // Guards calibration leaks: fitting on rows of matches played at or after event N's cutoff. Event 7's
        // match is postponed past event N's start, so its row exists before event N but must not be used.
        const postponed = () => {
            const data = world(12, () => true)

            for (const x of [...data.fixtures, ...data.matches]) {
                if (x.fixtureId === fixtureId(7)) x.kickoff = day(N * 7 + 4)
            }

            return data
        }

        const a = postponed()
        const later = postponed()
        const earlier = postponed()

        mutateFrom(later, day(N * 7))

        for (const r of earlier.fplMatches.get('p1') ?? []) if (r.event === 5) r.totalPoints += 10

        const cal = (data: ForecastDataset) =>
            scoreEvents(data, { calibrationMinRows: 1 }).calibrationByEvent.get(N)?.MID
        const points = (data: ForecastDataset) => predictions(ofEvent(data, (m) => m === 'points'))

        expect(cal(a)).not.toEqual({ intercept: 0, slope: 1 })
        expect(cal(later)).toEqual(cal(a))
        expect(points(later)).toEqual(points(a))
        expect(cal(earlier)).not.toEqual(cal(a))
    })

    it('event N outcome probabilities and league baseline ignore later scores', () => {
        // Guards outcome leaks: later results feeding team strengths or the league home/draw/away shares.
        const a = world(12, () => true)
        const later = world(12, () => true)
        const earlier = world(12, () => true)

        mutateFrom(later, cutoffAfterN)
        ;(earlier.fixtures.find((f) => f.fixtureId === fixtureId(5)) as DatasetFixture).homeGoals = 5

        const outcome = (data: ForecastDataset) => predictions(ofEvent(data, (m) => m === 'outcome'))

        expect(outcome(a).length).toBeGreaterThan(1)
        expect(outcome(later)).toEqual(outcome(a))
        expect(outcome(earlier)).not.toEqual(outcome(a))
    })

    it('keeps one calibration row per player and fixture when a blank makes a match team match 1 twice', () => {
        const data = world(10, () => true)
        const blank = data.fixtures.find((f) => f.fixtureId === fixtureId(6)) as DatasetFixture

        // A and B blank event 6; C plays D, and p3 (C) gives the event an FPL row.
        Object.assign(blank, { fixtureId: 'x6', homeTeamId: 'C', awayTeamId: 'D' })
        data.matches = data.matches.filter((m) => m.fixtureId !== fixtureId(6))
        data.matches.push({
            ...data.matches[0],
            kickoff: day(42),
            fixtureId: 'x6',
            teamId: 'C',
            playerId: 'p3',
        })
        data.players.push({ playerId: 'p3', fplId: 3, position: 'MID', currentTeamId: 'C' })
        data.fplMatches.set('p3', [{ ...(data.fplMatches.get('p1') ?? [])[0], fixtureId: 'x6', event: 6 }])

        for (const pid of ['p1', 'p2']) {
            data.fplMatches.set(
                pid,
                (data.fplMatches.get(pid) ?? []).filter((r) => r.fixtureId !== fixtureId(6)),
            )
        }

        const keys = scoreEvents(data).calibrationRows.map((r) => `${r.playerId}:${r.fixtureId}`)

        expect(keys).toContain(`p1:${fixtureId(7)}`)
        expect(new Set(keys).size).toBe(keys.length)
    })
})

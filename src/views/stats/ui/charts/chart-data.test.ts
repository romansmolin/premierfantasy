import { describe, expect, it } from 'vitest'

import { bucketBars, formSeries, goalOutlookSeries, minutesSeries } from './chart-data'

import type { FormMatch, PlayerProbabilityCard } from '@/server/stats/service/stats.service.interface'

const match = (i: number, over: Partial<FormMatch> = {}): FormMatch => ({
    fixtureId: `f${i}`,
    kickoff: new Date(Date.UTC(2026, 0, 1 + i)),
    opponentName: `T${i}`,
    isHome: i % 2 === 1,
    minutes: 90,
    started: true,
    goals: 0,
    xg: 0.3,
    assists: 0,
    xa: 0.1,
    ...over,
})

const labelOf = (i: number) => (i % 2 === 1 ? `vs T${i} (H)` : `at T${i} (A)`)
// Deliberately not in kickoff order, so a missing or reversed sort fails.
const SHUFFLED = [7, 2, 10, 4, 1, 9, 6, 3, 8, 5]

describe('formSeries', () => {
    it('keeps both matches of a double gameweek', () => {
        // Same gameweek, kickoffs hours apart, different opponents; passed late-first.
        const late = match(2, { kickoff: new Date(Date.UTC(2026, 0, 10, 20)) })
        const early = match(1, { kickoff: new Date(Date.UTC(2026, 0, 10, 12)) })
        const rows = formSeries([match(3, { kickoff: new Date(Date.UTC(2026, 0, 17, 15)) }), late, early], 10)

        expect(rows.map((r) => r.label)).toEqual([labelOf(1), labelOf(2), labelOf(3)])
    })

    it('last 5 of 10 keeps kickoff order', () => {
        const rows = formSeries(
            SHUFFLED.map((i) => match(i)),
            5,
        )

        expect(rows.map((r) => r.label)).toEqual([6, 7, 8, 9, 10].map(labelOf))
    })

    it('marks hasXg true when xg is present', () => {
        const [row] = formSeries([match(1, { xg: 0.4 })], 10)

        expect(row.hasXg).toBe(true)
        expect(row.xg).toBe(0.4)
    })

    it('marks hasXg false when xg is null and never substitutes 0', () => {
        const [row] = formSeries([match(1, { xg: null, xa: null })], 10)

        expect(row.hasXg).toBe(false)
        expect(row.xg).toBeNull()
        expect(row.xa).toBeNull()
    })
})

describe('goalOutlookSeries', () => {
    it('keeps null as null', () => {
        const row = (horizon: number, pGoal: number | null): PlayerProbabilityCard['matches'][number] => ({
            fixtureId: `f${horizon}`,
            kickoff: new Date(Date.UTC(2026, 0, horizon)),
            opponentName: 'ARS',
            isHome: true,
            horizon,
            pGoal,
            pAssist: null,
            pStart: null,
            expectedMinutes: null,
            expectedPoints: null,
            pointsBuckets: null,
            pWin: null,
            pDraw: null,
            pLose: null,
        })
        const rows = goalOutlookSeries([row(1, null), row(2, 0.2)])

        expect(rows.map((r) => r.pGoal)).toEqual([null, 0.2])
        expect(rows.map((r) => r.horizon)).toEqual([1, 2])
    })
})

describe('bucketBars', () => {
    it('is null for null input and sums to 1 otherwise', () => {
        expect(bucketBars(null)).toBeNull()

        const bars = bucketBars([0.4, 0.3, 0.2, 0.1])

        expect(bars?.map((b) => b.label)).toEqual(['0–2', '3–5', '6–9', '10+'])
        expect(bars?.reduce((s, b) => s + b.share, 0)).toBeCloseTo(1)
    })
})

describe('minutesSeries', () => {
    it('marks a 0-minute row unused and started=false with minutes > 0 as sub', () => {
        const rows = minutesSeries([
            match(1, { minutes: 0, started: false }),
            match(2, { minutes: 20, started: false }),
            match(3, { minutes: 90, started: true }),
        ])

        expect(rows.map((r) => r.role)).toEqual(['unused', 'sub', 'start'])
    })

    it('keeps kickoff order', () => {
        const rows = minutesSeries(SHUFFLED.map((i) => match(i)))

        expect(rows.map((r) => r.label)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(labelOf))
    })
})

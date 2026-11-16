import { describe, expect, it } from 'vitest'

import { bucketBars, formSeries, goalOutlookSeries, minutesSeries } from './chart-data'

import type { FormMatch, PlayerProbabilityCard } from '@/server/stats/service/stats.service.interface'

const match = (i: number, over: Partial<FormMatch> = {}): FormMatch => ({
    fixtureId: `f${i}`,
    kickoff: new Date(Date.UTC(2026, 0, 1 + i)),
    opponentName: i % 2 ? 'ARS' : 'CHE',
    isHome: i % 2 === 1,
    minutes: 90,
    started: true,
    goals: 0,
    xg: 0.3,
    assists: 0,
    xa: 0.1,
    ...over,
})

describe('formSeries', () => {
    it('keeps both matches of a double gameweek', () => {
        const rows = formSeries(
            [match(1), match(2, { kickoff: new Date(Date.UTC(2026, 0, 1, 12)) }), match(3)],
            10,
        )

        expect(rows).toHaveLength(3)
    })

    it('last 5 of 10 keeps kickoff order', () => {
        const rows = formSeries(
            Array.from({ length: 10 }, (_, i) => match(i + 1)),
            5,
        )

        expect(rows.map((r) => r.label)).toEqual([
            'at CHE (A)',
            'vs ARS (H)',
            'at CHE (A)',
            'vs ARS (H)',
            'at CHE (A)',
        ])
        expect(rows).toHaveLength(5)
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
})

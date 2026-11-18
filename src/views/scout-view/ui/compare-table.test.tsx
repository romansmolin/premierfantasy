import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { seasonTotals } from '@/server/stats/lib/player-form'

import type { ScoutProfile } from '@/entities/scout'

import { CompareTable, compareRows } from './compare-table'

import type { PlayerProbabilityCard } from '@/server/stats/service/stats.service.interface'

type Match = PlayerProbabilityCard['matches'][number]

const match = (over: Partial<Match> = {}): Match => ({
    fixtureId: 'f1',
    kickoff: new Date(Date.UTC(2026, 10, 21, 15)),
    opponentName: 'Arsenal',
    isHome: true,
    horizon: 1,
    pGoal: 0.2,
    pAssist: 0.1,
    pStart: 0.9,
    expectedMinutes: 80,
    expectedPoints: 5.5,
    pointsBuckets: null,
    pWin: null,
    pDraw: null,
    pLose: null,
    ...over,
})

const profile = (
    id: string,
    over: { goals?: number; price?: number | null; matches?: Match[] | null; xg?: number | null } = {},
): ScoutProfile => ({
    profile: {
        player: {
            id,
            externalId: 1,
            name: `Player ${id}`,
            position: 'MID',
            club: { id: 'c', name: 'Club', logo: null },
            price: over.price === undefined ? 7 : over.price,
            availability: null,
        },
        totals: { ...seasonTotals([]), goals: over.goals ?? 0, minutes: 900 },
        form: 5,
        recent: [],
        forecastEnabled: true,
        forecast: null,
        facts: { form: [], penaltyOrder: null },
        probabilities:
            over.matches === null
                ? null
                : {
                      modelVersion: 'v2',
                      updatedAt: new Date(Date.UTC(2026, 10, 16)),
                      lowData: false,
                      matches: over.matches ?? [match()],
                      explanation: [],
                      offReasons: [],
                  },
    },
    radar: { lowData: false, reason: null, axes: [] },
    value: { points: 40, pointsPerMillion: 0.5, rank: 3, of: 10 },
    season: { xg: over.xg === undefined ? 3 : over.xg, xa: null },
})

const row = (rows: ReturnType<typeof compareRows>, key: string) => rows.find((r) => r.key === key)

describe('compareRows', () => {
    it('marks the player with the most goals as best', () => {
        const rows = compareRows([profile('a', { goals: 3 }), profile('b', { goals: 5 })])

        expect(row(rows, 'goals')?.values).toEqual([3, 5])
        expect(row(rows, 'goals')?.best).toEqual([1])
    })

    it('never marks a missing figure as best', () => {
        const rows = compareRows([
            profile('a', { matches: [match({ pGoal: null })] }),
            profile('b', { matches: [match({ pGoal: 0.2 })] }),
        ])

        expect(row(rows, 'pGoal')?.values).toEqual([null, 0.2])
        expect(row(rows, 'pGoal')?.best).toEqual([])
    })

    it('never highlights price or minutes, which have no better side', () => {
        const rows = compareRows([profile('a', { price: 5 }), profile('b', { price: 9 })])

        expect(row(rows, 'price')?.best).toEqual([])
        expect(row(rows, 'minutes')?.best).toEqual([])
    })

    it('takes the forecast from the next match only and has none without a probability card', () => {
        const rows = compareRows([
            profile('a', { matches: [match({ horizon: 2, expectedPoints: 9 })] }),
            profile('b', { matches: null }),
        ])

        expect(row(rows, 'xPts')?.values).toEqual([null, null])
    })
})

describe('CompareTable', () => {
    const html = (players: ScoutProfile[]) => renderToStaticMarkup(<CompareTable players={players} />)

    it('marks the best cell by a star and text, not only by colour', () => {
        const out = html([profile('a', { goals: 3 }), profile('b', { goals: 5 })])

        expect(out).toContain('★')
        expect(out).toContain('Best')
    })

    it('shows a dash for a missing figure, never 0 or 0%', () => {
        const out = html([profile('a', { xg: null }), profile('b', { matches: null })])

        expect(out).toContain('>—<')
        expect(out).not.toContain('>0%<')
    })
})

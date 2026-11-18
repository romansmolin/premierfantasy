import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { PlayerProfileView } from './player-profile-view'

import type { FormMatch, PlayerProfile } from '@/server/stats/service/stats.service.interface'

vi.mock('@/features/ai', () => ({ PlayerAiAnalysis: () => null }))

const formRow = (i: number): FormMatch => ({
    fixtureId: `f${i}`,
    kickoff: new Date(Date.UTC(2026, 9, i)),
    opponentName: `T${i}`,
    isHome: i % 2 === 0,
    minutes: 90,
    started: true,
    goals: i % 3 === 0 ? 1 : 0,
    xg: 0.3,
    assists: 0,
    xa: null,
})

const profile: PlayerProfile = {
    player: {
        id: 'p1',
        externalId: 306,
        name: 'Mohamed Salah',
        position: 'MID',
        club: { id: 'LIV', name: 'Liverpool', logo: null },
        price: 14,
        availability: null,
    },
    totals: {
        appearances: 3,
        minutes: 270,
        goals: 1,
        assists: 0,
        shots: 5,
        keyPasses: 2,
        tackles: 1,
        yellowCards: 0,
        redCards: 0,
    },
    form: 5.2,
    recent: [
        {
            fixtureId: 'f3',
            kickoff: new Date(Date.UTC(2026, 9, 3)),
            opponentName: 'T3',
            isHome: false,
            minutes: 90,
            goals: 1,
            assists: 0,
            points: 8,
        },
    ],
    forecastEnabled: false,
    forecast: null,
    // Shuffled and with a double gameweek (same day), as the charts must sort them.
    facts: {
        form: [3, 1, 2, 5, 4].map(formRow).concat([{ ...formRow(5), fixtureId: 'f5b' }]),
        penaltyOrder: 1,
    },
    probabilities: {
        modelVersion: 'ewma-poisson-v2',
        updatedAt: new Date(Date.UTC(2026, 10, 16, 12)),
        lowData: false,
        explanation: ['Started 5 of the last 5 team matches'],
        offReasons: [],
        matches: [
            {
                fixtureId: 'n1',
                kickoff: new Date(Date.UTC(2026, 10, 21, 15)),
                opponentName: 'Arsenal',
                isHome: true,
                horizon: 1,
                pGoal: 0.4,
                pAssist: 0.2,
                pStart: 0.9,
                expectedMinutes: 80,
                expectedPoints: null,
                pointsBuckets: null,
                pWin: 0.5,
                pDraw: 0.25,
                pLose: 0.25,
            },
        ],
    },
}

describe('PlayerProfileView', () => {
    it('renders a profile that came back from unstable_cache (dates as strings)', () => {
        const cached = JSON.parse(JSON.stringify(profile)) as PlayerProfile

        expect(typeof cached.facts.form[0].kickoff).toBe('string')

        const html = renderToStaticMarkup(<PlayerProfileView profile={cached} />)

        expect(html).toContain('Mohamed Salah')
        // v1 is off, yet the probabilities still show on their own gates.
        expect(html).toContain('Chance to score')
        expect(html).toContain('40%')
    })
})

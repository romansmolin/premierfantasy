import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ProbabilityCard } from './probability-card'

import type { PlayerProbabilityCard } from '@/server/stats/service/stats.service.interface'

const card = (
    over: Partial<PlayerProbabilityCard> = {},
    m: Partial<PlayerProbabilityCard['matches'][number]> = {},
) =>
    ({
        modelVersion: 'ewma-poisson-v2',
        updatedAt: new Date(Date.UTC(2026, 10, 16, 12)),
        lowData: false,
        explanation: ['He starts most weeks.'],
        offReasons: ['Assist chance is off until it beats a baseline.'],
        matches: [
            {
                fixtureId: 'f1',
                kickoff: new Date(Date.UTC(2026, 10, 21, 15)),
                opponentName: 'Arsenal',
                isHome: true,
                horizon: 1,
                pGoal: 0.004,
                pAssist: null,
                pStart: 0.9,
                expectedMinutes: 78.4,
                expectedPoints: 5.84,
                pointsBuckets: null,
                pWin: 0.5,
                pDraw: 0.25,
                pLose: 0.25,
                ...m,
            },
        ],
        ...over,
    }) satisfies PlayerProbabilityCard

const html = (c: PlayerProbabilityCard | null, forecastOn = true) =>
    renderToStaticMarkup(<ProbabilityCard card={c} forecastOn={forecastOn} />)

describe('ProbabilityCard', () => {
    it('shows a dash with the reason for a null figure, never 0%', () => {
        const out = html(card())

        expect(out).toContain('title="Assist chance is off until it beats a baseline."')
        expect(out).toContain('>—<')
        expect(out).not.toContain('>0%<')
        expect(out).toContain('90%')
    })

    it('formats tiny chances as <1%', () => expect(html(card())).toContain('&lt;1%'))

    it('formats minutes and points', () => {
        const out = html(card())

        expect(out).toContain('>78<')
        expect(out).toContain('>5.8<')
    })

    it('lowData shows the message instead of figures', () => {
        const out = html(card({ lowData: true, matches: [] }))

        expect(out).toContain('Not enough data yet: fewer than 3 appearances')
        expect(out).not.toContain('Chance to score')
    })

    it('forecastOn=false shows facts-only note linking to the method page', () => {
        const out = html(card(), false)

        expect(out).toContain('switched off')
        expect(out).toContain('href="/how-we-calculate"')
        expect(out).not.toContain('Chance to score')
    })

    it('null card or empty matches is facts-only', () => {
        expect(html(null)).toContain('No forecast for this player')
        expect(html(card({ matches: [] }))).toContain('No forecast for this player')
    })
})

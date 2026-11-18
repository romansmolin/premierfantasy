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

const html = (c: PlayerProbabilityCard | null) => renderToStaticMarkup(<ProbabilityCard card={c} />)

describe('ProbabilityCard', () => {
    it('shows a dash with the reason for a null figure, never 0%', () => {
        const out = html(card())

        expect(out).toContain('Assist chance is off until it beats a baseline.')
        expect(out).toContain('>—<')
        expect(out).not.toContain('>0%<')
        expect(out).toContain('90%')
    })

    it('lists off reasons visibly (not only in a title) when a figure is hidden', () => {
        const out = html(card({ offReasons: ['Reason one.', 'Reason two.'] }))

        expect(out).toContain('<li>Reason one.</li>')
        expect(out).toContain('<li>Reason two.</li>')
        expect(out).not.toContain('title=')
    })

    it('omits the reasons list when no figure is hidden', () => {
        const out = html(card({}, { pAssist: 0.2 }))

        expect(out).not.toContain('<li>Assist chance')
        expect(out).not.toContain('<ul class="list-disc')
    })

    it('says the figures are for the next match only when two matches are listed', () => {
        const two = card()

        two.matches = [two.matches[0], { ...two.matches[0], fixtureId: 'f2', horizon: 2 }]

        expect(html(two)).toContain('Figures are for the next match only')
        expect(html(card())).not.toContain('Figures are for the next match only')
    })

    it('has a Forecast h2 and a No forecast badge on the facts-only note', () => {
        expect(html(card())).toContain('<h2')
        expect(html(null)).toContain('No forecast</span>')
        expect(html(null)).not.toContain('>Forecast</span>')
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

    it('shows the probabilities on their own gates, whatever the v1 points forecast does', () => {
        const out = html(card({}, { expectedPoints: null }))

        expect(out).toContain('Chance to score')
        expect(out).toContain('90%')
        expect(out).not.toContain('The forecast is switched off')
    })

    it('a hidden figure without listed reasons still gets a visible fallback line', () => {
        const out = html(card({ offReasons: [] }))

        expect(out).toContain('Some numbers are switched off or unavailable; see')
        expect(out).toContain('href="/how-we-calculate"')
    })

    it('renders a card whose dates came back from the cache as strings', () => {
        const cached = JSON.parse(JSON.stringify(card())) as PlayerProbabilityCard

        expect(() => html(cached)).not.toThrow()
        expect(html(cached)).toContain('Sat 21 Nov')
    })

    it('null card or empty matches is facts-only', () => {
        expect(html(null)).toContain('No forecast for this player')
        expect(html(card({ matches: [] }))).toContain('No forecast for this player')
    })
})

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FixtureHeatmap } from './fixture-heatmap'

import type { IStatsService } from '@/server/stats/service/stats.service.interface'

type Data = Awaited<ReturnType<IStatsService['getHeatmap']>>

const data: Data = {
    events: [12, 13, 14],
    clubs: [
        {
            clubId: 'a',
            name: 'Arsenal',
            cells: [
                {
                    event: 12,
                    matches: [{ opponent: 'Chelsea', isHome: true, xgFor: 1.94, pCleanSheet: 0.31 }],
                },
                {
                    event: 13,
                    matches: [
                        { opponent: 'Spurs', isHome: false, xgFor: 2.5, pCleanSheet: 0.004 },
                        { opponent: 'Fulham', isHome: true, xgFor: 0.8, pCleanSheet: 0.5 },
                    ],
                },
                { event: 14, matches: [] },
            ],
        },
    ],
}

describe('FixtureHeatmap', () => {
    it('prints expected goals, home/away marks and a stacked double gameweek', () => {
        const html = renderToStaticMarkup(<FixtureHeatmap data={data} metric="xg" />)

        expect(html).toContain('GW12')
        expect(html).toContain('1.9')
        expect(html).toContain('2.5')
        expect(html).toContain('0.8')
        expect(html).toContain('Expected goals scored by the club in that match')
        expect(html).toContain('Forecast')
        expect(html).toMatch(/aria-current="page"[^>]*>Expected goals/)
    })

    it('prints clean-sheet chances', () => {
        const html = renderToStaticMarkup(<FixtureHeatmap data={data} metric="cs" />)

        expect(html).toContain('31%')
        expect(html).toContain('&lt;1%')
        expect(html).toContain('Chance the club keeps a clean sheet')
    })

    it('marks a blank gameweek in text and tooltip', () => {
        const html = renderToStaticMarkup(<FixtureHeatmap data={data} metric="xg" />)

        expect(html).toContain('title="No match"')
        expect(html).toContain('No match</span>')
    })

    it('shows an empty state without clubs', () => {
        const html = renderToStaticMarkup(<FixtureHeatmap data={{ events: [], clubs: [] }} metric="xg" />)

        expect(html).toContain('Forecasts are not available yet')
        expect(html).not.toContain('<table')
    })
})

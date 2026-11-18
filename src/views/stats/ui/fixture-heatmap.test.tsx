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
                    hidden: false,
                },
                {
                    event: 13,
                    matches: [
                        { opponent: 'Spurs', isHome: false, xgFor: 2.5, pCleanSheet: 0.004 },
                        { opponent: 'Fulham', isHome: true, xgFor: 0.8, pCleanSheet: 0.5 },
                    ],
                    hidden: false,
                },
                { event: 14, matches: [], hidden: false },
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

    it('tells a hidden forecast from a real blank gameweek', () => {
        const hiddenData: Data = {
            events: [12, 13, 14],
            clubs: [
                {
                    clubId: 'a',
                    name: 'Arsenal',
                    cells: [
                        {
                            event: 12,
                            matches: [{ opponent: 'Chelsea', isHome: true, xgFor: 1.94, pCleanSheet: 0.31 }],
                            hidden: false,
                        },
                        { event: 13, matches: [], hidden: true },
                        { event: 14, matches: [], hidden: false },
                    ],
                },
                {
                    clubId: 'b',
                    name: 'Spurs',
                    cells: [
                        {
                            event: 12,
                            matches: [{ opponent: 'Fulham', isHome: false, xgFor: 1.1, pCleanSheet: 0.2 }],
                            hidden: true,
                        },
                        { event: 13, matches: [], hidden: false },
                        { event: 14, matches: [], hidden: false },
                    ],
                },
            ],
        }
        const html = renderToStaticMarkup(<FixtureHeatmap data={hiddenData} metric="xg" />)

        expect(html).toContain('title="No forecast"')
        expect(html).toContain('No forecast for this match (switched off or not enough data)')
        expect(html).toContain('title="No match"')
        expect(html).toContain('another match has no forecast')
    })

    it('falls back to the empty state when no cell shows a match', () => {
        const html = renderToStaticMarkup(
            <FixtureHeatmap
                data={{
                    events: [12],
                    clubs: [
                        { clubId: 'a', name: 'Arsenal', cells: [{ event: 12, matches: [], hidden: true }] },
                    ],
                }}
                metric="xg"
            />,
        )

        expect(html).toContain('Forecasts are not available yet')
        expect(html).not.toContain('<table')
    })

    it('shows an empty state without clubs', () => {
        const html = renderToStaticMarkup(<FixtureHeatmap data={{ events: [], clubs: [] }} metric="xg" />)

        expect(html).toContain('Forecasts are not available yet')
        expect(html).not.toContain('<table')
    })
})

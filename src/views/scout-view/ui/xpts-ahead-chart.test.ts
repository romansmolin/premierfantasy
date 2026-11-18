import { describe, expect, it } from 'vitest'

import type { ScoutProfile } from '@/entities/scout'

import { aheadRows } from './xpts-ahead-chart'

const withMatches = (
    matches: { horizon: number; opponentName: string; expectedPoints: number | null }[] | null,
) =>
    ({
        profile: {
            probabilities: matches && {
                matches: matches.map((m) => ({ ...m, fixtureId: `f${m.horizon}` })),
            },
        },
    }) as unknown as ScoutProfile

describe('aheadRows', () => {
    it('lines the players up by how many matches ahead, with the opponent of each', () => {
        const rows = aheadRows([
            withMatches([
                { horizon: 1, opponentName: 'Arsenal', expectedPoints: 5 },
                { horizon: 2, opponentName: 'Chelsea', expectedPoints: 4 },
            ]),
            withMatches([{ horizon: 1, opponentName: 'Spurs', expectedPoints: 6 }]),
        ])

        expect(rows).toEqual([
            { horizon: 1, label: 'Next', opponents: ['Arsenal', 'Spurs'], values: [5, 6] },
            { horizon: 2, label: '+1', opponents: ['Chelsea', null], values: [4, null] },
        ])
    })

    it('draws nothing without a single forecast', () => {
        expect(
            aheadRows([
                withMatches(null),
                withMatches([{ horizon: 1, opponentName: 'X', expectedPoints: null }]),
            ]),
        ).toEqual([])
    })
})

import { describe, expect, it } from 'vitest'

import type { RadarProfile } from '@/entities/scout'

import { radarRows } from './radar-chart'

const axes = (percentiles: (number | null)[]): RadarProfile['axes'] =>
    (['goals', 'xg', 'assists', 'xa'] as const).map((key, i) => ({
        key,
        label: `${key} label`,
        value: 1,
        percentile: percentiles[i] ?? null,
    }))

const radar = (percentiles: (number | null)[], over: Partial<RadarProfile> = {}): RadarProfile => ({
    lowData: false,
    reason: null,
    axes: axes(percentiles),
    ...over,
})

describe('radarRows', () => {
    it('gives one row per axis with a value for each series, keyed by series index', () => {
        const { rows, skipped } = radarRows([
            { name: 'Saka', radar: radar([80, 60, 40, 20]) },
            { name: 'Palmer', radar: radar([10, 20, 30, 40]) },
        ])

        expect(skipped).toEqual([])
        expect(rows).toEqual([
            { axis: 'goals label', s0: 80, s1: 10 },
            { axis: 'xg label', s0: 60, s1: 20 },
            { axis: 'assists label', s0: 40, s1: 30 },
            { axis: 'xa label', s0: 20, s1: 40 },
        ])
    })

    it('keeps series with the same name apart', () => {
        const { rows } = radarRows([
            { name: 'Same', radar: radar([1, 2, 3, 4]) },
            { name: 'Same', radar: radar([5, 6, 7, 8]) },
        ])

        expect(rows[0]).toEqual({ axis: 'goals label', s0: 1, s1: 5 })
    })

    it('drops an axis any series has no percentile for and names it as skipped', () => {
        const { rows, skipped } = radarRows([
            { name: 'A', radar: radar([80, null, 40, 20]) },
            { name: 'B', radar: radar([10, 20, 30, 40]) },
        ])

        expect(rows.map((r) => r.axis)).toEqual(['goals label', 'assists label', 'xa label'])
        expect(skipped).toEqual(['xg label'])
    })

    it('leaves a low-data series out of the rows without skipping axes for the others', () => {
        const { rows, skipped } = radarRows([
            {
                name: 'Rookie',
                radar: radar([null, null, null, null], { lowData: true, reason: 'Few minutes' }),
            },
            { name: 'Regular', radar: radar([80, 60, 40, 20]) },
        ])

        expect(skipped).toEqual([])
        expect(rows[0]).toEqual({ axis: 'goals label', s1: 80 })
    })

    it('draws nothing when fewer than three axes remain', () => {
        const { rows, skipped } = radarRows([{ name: 'A', radar: radar([80, null, null, 20]) }])

        expect(rows).toEqual([])
        expect(skipped).toEqual(['xg label', 'assists label'])
    })
})

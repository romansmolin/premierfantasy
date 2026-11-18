import { describe, expect, it } from 'vitest'

import { calibrationRows, groupGates } from './method-data'

import type { GateResult } from '@/server/prediction/lib/v2/evaluation'

const gate = (over: Partial<GateResult>): GateResult => ({
    metric: 'goal',
    horizon: 'next',
    position: 'ALL',
    n: 400,
    brier: 0.1,
    baselineBrier: 0.12,
    buckets: [],
    passed: true,
    reasons: [],
    ...over,
})

describe('groupGates', () => {
    it('returns nothing for no gates', () => {
        expect(groupGates([])).toEqual([])
    })

    it('orders metrics, then next before later, then positions', () => {
        const groups = groupGates([
            gate({ metric: 'outcome', position: 'ALL' }),
            gate({ metric: 'goal', horizon: 'later', position: 'FWD' }),
            gate({ metric: 'goal', horizon: 'next', position: 'ALL' }),
            gate({ metric: 'goal', horizon: 'next', position: 'GK' }),
            gate({ metric: 'goal', horizon: 'next', position: 'MID' }),
            gate({ metric: 'points', position: 'DEF' }),
            gate({ metric: 'start', position: 'ALL' }),
            gate({ metric: 'assist', position: 'ALL' }),
        ])

        expect(groups.map((g) => g.metric)).toEqual(['goal', 'assist', 'start', 'points', 'outcome'])
        expect(groups[0].rows.map((r) => `${r.horizon}:${r.position}`)).toEqual([
            'next:GK',
            'next:MID',
            'next:ALL',
            'later:FWD',
        ])
    })

    it('keeps the fields the table shows', () => {
        const [group] = groupGates([gate({ passed: false, reasons: ['only 12 records'] })])

        expect(group.rows[0]).toEqual({
            horizon: 'next',
            position: 'ALL',
            n: 400,
            brier: 0.1,
            baselineBrier: 0.12,
            passed: false,
            reasons: ['only 12 records'],
        })
    })
})

describe('calibrationRows', () => {
    it('is empty without buckets', () => {
        expect(calibrationRows([])).toEqual([])
    })

    it('formats ranges and whole percents', () => {
        expect(
            calibrationRows([
                { lo: 0.1, hi: 0.2, n: 50, predicted: 0.1534, observed: 0.18 },
                { lo: 0.9, hi: 1, n: 31, predicted: 0.93, observed: 0.9 },
            ]),
        ).toEqual([
            { range: '10–20%', predicted: '15%', observed: '18%', n: 50 },
            { range: '90–100%', predicted: '93%', observed: '90%', n: 31 },
        ])
    })

    it('does not clamp tail percents to "<1%"', () => {
        expect(calibrationRows([{ lo: 0, hi: 0.1, n: 40, predicted: 0.004, observed: 0 }])).toEqual([
            { range: '0–10%', predicted: '0%', observed: '0%', n: 40 },
        ])
    })
})

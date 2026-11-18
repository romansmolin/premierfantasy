import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MethodView } from './method-view'

import type { MethodParams } from './method-data'
import type { GateResult } from '@/server/prediction/lib/v2/evaluation'
import type { ProbabilityStatus } from '@/server/prediction/service/probability.service.interface'

const params: MethodParams = {
    decay: 0.9,
    minutesDecay: 0.8,
    priorMinutes90: 450,
    xgWeight: 0.5,
    sims: 2000,
    horizonMatches: 5,
    minAppearances: 3,
    minExpectedMinutes: 30,
    minHistoryMatches: 5,
    gate: { minEvents: 8, minRecords: 300, minBucketN: 30, maxBucketGap: 0.07, minBrierEdge: 0.001 },
}

const forecast = { enabled: false, nextEvent: null, evaluation: null }

const gate = (over: Partial<GateResult>): GateResult => ({
    metric: 'goal',
    horizon: 'next',
    position: 'ALL',
    n: 412,
    brier: 0.0812,
    baselineBrier: 0.0934,
    buckets: [{ lo: 0.4, hi: 0.5, n: 60, predicted: 0.44, observed: 0.41 }],
    passed: true,
    reasons: [],
    ...over,
})

const render = (probability: Partial<ProbabilityStatus>) =>
    renderToStaticMarkup(
        <MethodView
            status={forecast}
            params={params}
            probability={{
                evaluatedAt: null,
                eventsEvaluated: 0,
                gates: [],
                pointsMeanOn: false,
                updatedAt: null,
                ...probability,
            }}
        />,
    )

describe('MethodView', () => {
    it('states that probabilities are off before the first check', () => {
        const html = render({})

        expect(html).toContain('The first accuracy check has not run yet, so probabilities are off')
        expect(html).toContain('No metric is on yet')
    })

    it('shows On and Off as text, the Off reason, and the documented parameters', () => {
        const html = render({
            evaluatedAt: new Date(Date.UTC(2026, 10, 16, 3)),
            eventsEvaluated: 10,
            gates: [
                gate({}),
                gate({
                    position: 'GK',
                    n: 12,
                    passed: false,
                    reasons: ['only 12 records, at least 300 needed'],
                }),
            ],
        })

        expect(html).toContain('>On<')
        expect(html).toContain('>Off<')
        expect(html).toContain('only 12 records, at least 300 needed')
        expect(html).toContain('0.0812')
        expect(html).toContain('When we say 44%, it happened 41% of the time')
        expect(html).toContain('450')
        expect(html).toContain('>2000<')
    })

    it('states the scope of the check and the gap in percentage points', () => {
        const html = render({})

        expect(html).toContain('7 percentage points')
        expect(html).not.toContain('7% points')
        expect(html).toContain('expected to play at least 30 minutes and with at least 5 earlier')
        expect(html).toContain('were not part of the check')
        expect(html).toContain('extrapolated beyond what it covers')
    })

    it('renders a status whose dates came back from the cache as strings', () => {
        const cached = JSON.parse(
            JSON.stringify({
                evaluatedAt: new Date(Date.UTC(2026, 10, 16, 3)),
                updatedAt: new Date(Date.UTC(2026, 10, 16, 4)),
                eventsEvaluated: 10,
                gates: [gate({})],
            }),
        ) as Partial<ProbabilityStatus>

        expect(typeof cached.evaluatedAt).toBe('string')
        expect(render(cached)).toContain('Mon 16 Nov, 03:00 UTC')
    })
})

import { describe, expect, it } from 'vitest'

import { explainForecast } from './explain'

import type { ExplainFacts } from './explain'

const empty: ExplainFacts = {
    startsOfLast: null,
    penaltyOrder: null,
    goalsLast10: null,
    xgLast10: null,
    expectedTeamGoals: null,
    leagueGoals: null,
    unavailable: null,
}

describe('explainForecast', () => {
    it('is empty for all-null facts', () => {
        expect(explainForecast(empty)).toEqual([])
    })

    it('returns at most 3 sentences, unavailable first', () => {
        const out = explainForecast({
            startsOfLast: { started: 9, of: 10 },
            penaltyOrder: 1,
            goalsLast10: 4,
            xgLast10: 3.1,
            expectedTeamGoals: 1.9,
            leagueGoals: 1.4,
            unavailable: 'Knee injury',
        })

        expect(out).toHaveLength(3)
        expect(out[0]).toBe('Unavailable: Knee injury')
        expect(out[1]).toBe('Started 9 of the last 10 team matches')
        expect(out[2]).toBe('First-choice penalty taker')
    })

    it('words the team goals high or low and skips small gaps', () => {
        const high = explainForecast({ ...empty, expectedTeamGoals: 1.9, leagueGoals: 1.4 })
        const low = explainForecast({ ...empty, expectedTeamGoals: 0.9, leagueGoals: 1.4 })

        expect(high[0]).toContain('Team is expected to score 1.9 goals here (league average 1.4)')
        expect(high[0]).toContain('high')
        expect(low[0]).toContain('low')
        expect(explainForecast({ ...empty, expectedTeamGoals: 1.5, leagueGoals: 1.4 })).toEqual([])
    })

    it('mentions only the first-choice penalty taker', () => {
        expect(explainForecast({ ...empty, penaltyOrder: 2 })).toEqual([])
    })

    it('has no xG sentence without xG or with a small gap', () => {
        expect(explainForecast({ ...empty, goalsLast10: 4, xgLast10: null })).toEqual([])
        expect(explainForecast({ ...empty, goalsLast10: 4, xgLast10: 3.5 })).toEqual([])
        expect(explainForecast({ ...empty, goalsLast10: 4, xgLast10: 2.9 })).toEqual([
            'Scored 4 goals from 2.9 xG in the last 10',
        ])
    })
})

import { describe, expect, it } from 'vitest'

import { computeTeamStrengths, expectedGoals } from './team-strength'

import type { FinishedMatch } from './team-strength'

const match = (day: number, home: string, away: string, hg: number, ag: number): FinishedMatch => ({
    kickoff: new Date(Date.UTC(2026, 7, day)),
    homeTeamId: home,
    awayTeamId: away,
    homeGoals: hg,
    awayGoals: ag,
})

// A scores 4, B scores 0 in every match: league average is 2 goals per team.
const eightMatches = Array.from({ length: 8 }, (_, i) =>
    i % 2 === 0 ? match(i + 1, 'A', 'B', 4, 0) : match(i + 1, 'B', 'A', 0, 4),
)
const cutoff = new Date(Date.UTC(2026, 7, 20))

describe('computeTeamStrengths', () => {
    it('shrinks a strong attack toward the league average', () => {
        const s = computeTeamStrengths(eightMatches, cutoff)

        expect(s.leagueGoalsPerTeam).toBeCloseTo(2, 12)
        // (8 matches * 4 goals + 4 prior matches * 2) / (8 + 4) / 2
        expect(s.attack.get('A')).toBeCloseTo(40 / 12 / 2, 6)
        expect(s.defence.get('A')).toBeCloseTo((0 * 8 + 2 * 4) / 12 / 2, 6)
    })

    it('ignores matches at or after the cutoff', () => {
        const before = computeTeamStrengths(eightMatches, cutoff)
        const withLater = computeTeamStrengths(
            [...eightMatches, match(20, 'A', 'B', 0, 9), match(25, 'B', 'A', 9, 0)],
            cutoff,
        )

        expect(withLater.attack.get('A')).toBe(before.attack.get('A'))
        expect(withLater.leagueGoalsPerTeam).toBe(before.leagueGoalsPerTeam)
    })

    it('uses only the last N matches of a team', () => {
        const old = Array.from({ length: 10 }, (_, i) => match(i + 1, 'A', 'B', 0, 0))
        const recent = Array.from({ length: 8 }, (_, i) => match(i + 11, 'A', 'B', 6, 0))
        const s = computeTeamStrengths([...old, ...recent], new Date(Date.UTC(2026, 7, 28)), { lastN: 8 })
        const all = computeTeamStrengths([...old, ...recent], new Date(Date.UTC(2026, 7, 28)), { lastN: 18 })

        expect(s.attack.get('A') as number).toBeGreaterThan(all.attack.get('A') as number)
    })
})

describe('expectedGoals', () => {
    it('the home side expects more goals than the same side away', () => {
        const s = computeTeamStrengths(eightMatches, cutoff)

        expect(expectedGoals(s, 'A', 'B', true).for).toBeGreaterThan(expectedGoals(s, 'A', 'B', false).for)
    })

    it('an unknown team defaults to league-average strength', () => {
        const s = computeTeamStrengths(eightMatches, cutoff)
        const g = expectedGoals(s, 'X', 'Y', true)

        expect(g.for).toBeCloseTo(2 * 1.15, 9)
        expect(g.against).toBeCloseTo(2 * 0.87, 9)
    })

    it('a strong attack against a weak defence expects more than the reverse', () => {
        const s = computeTeamStrengths(eightMatches, cutoff)

        expect(expectedGoals(s, 'A', 'B', true).for).toBeGreaterThan(expectedGoals(s, 'B', 'A', true).for)
    })
})

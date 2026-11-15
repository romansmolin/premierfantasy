import { describe, expect, it } from 'vitest'

import { formOf, linePoints, seasonTotals } from './player-form'

import type { StatsLine } from './player-form'

const line = (overrides: Partial<StatsLine> = {}): StatsLine => ({
    kickoff: new Date('2026-09-01T15:00:00Z'),
    minutes: 90,
    goals: 0,
    assists: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    penaltySaved: 0,
    penaltyMissed: 0,
    tackles: 0,
    blocks: 0,
    interceptions: 0,
    shotsTotal: 0,
    passesKey: 0,
    teamGoalsAgainst: 1,
    ...overrides,
})

describe('linePoints', () => {
    it('applies FPL rules including clean sheet from the team goals against', () => {
        expect(linePoints('DEF', line({ teamGoalsAgainst: 0 }))).toBe(2 + 4)
        expect(linePoints('DEF', line({ teamGoalsAgainst: 2 }))).toBe(2 - 1)
    })

    it('counts tackles, blocks and interceptions as defensive actions', () => {
        expect(
            linePoints('DEF', line({ tackles: 4, blocks: 3, interceptions: 3, teamGoalsAgainst: 1 })),
        ).toBe(2 + 2)
    })

    it('is 0 when the player did not play', () => {
        expect(linePoints('FWD', line({ minutes: 0, goals: 1 }))).toBe(0)
    })
})

describe('formOf', () => {
    it('averages the last 5 appearances, newest first, ignoring matches without minutes', () => {
        const lines = [
            line({ kickoff: new Date('2026-09-10'), goals: 1, teamGoalsAgainst: 1 }),
            line({ kickoff: new Date('2026-09-09'), minutes: 0 }),
            ...[1, 2, 3, 4, 5, 6].map((d) => line({ kickoff: new Date(`2026-09-0${d}`) })),
        ]

        // MID in the test below; here FWD: 90 min = 2 pts, the goal match = 2 + 4
        expect(formOf('FWD', lines)).toBeCloseTo((6 + 2 + 2 + 2 + 2) / 5, 12)
    })

    it('is null without appearances', () => {
        expect(formOf('MID', [])).toBeNull()
    })
})

describe('seasonTotals', () => {
    it('sums minutes, goals, assists and counts appearances', () => {
        const totals = seasonTotals([
            line({ goals: 1, assists: 2 }),
            line({ minutes: 0 }),
            line({ minutes: 45, goals: 1 }),
        ])

        expect(totals).toMatchObject({ appearances: 2, minutes: 135, goals: 2, assists: 2 })
    })
})

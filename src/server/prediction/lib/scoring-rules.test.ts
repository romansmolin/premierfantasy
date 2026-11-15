import { describe, expect, it } from 'vitest'

import { pointsFromStats } from './scoring-rules'

import type { PointsInput } from './scoring-rules'

const line = (overrides: Partial<PointsInput> = {}): PointsInput => ({
    position: 'MID',
    minutes: 90,
    goals: 0,
    assists: 0,
    cleanSheet: false,
    goalsConceded: 0,
    saves: 0,
    penaltiesSaved: 0,
    penaltiesMissed: 0,
    ownGoals: 0,
    yellowCards: 0,
    redCards: 0,
    defensiveActions: 0,
    ...overrides,
})

describe('pointsFromStats', () => {
    it('0 minutes scores 0 whatever else is in the line', () => {
        expect(pointsFromStats(line({ minutes: 0, goals: 1 }))).toBe(0)
    })

    it('appearance is 1 point under 60 minutes and 2 from 60', () => {
        expect(pointsFromStats(line({ minutes: 30 }))).toBe(1)
        expect(pointsFromStats(line({ minutes: 59 }))).toBe(1)
        expect(pointsFromStats(line({ minutes: 60 }))).toBe(2)
    })

    it('a goal is 6 for GK and DEF, 5 for MID, 4 for FWD', () => {
        expect(pointsFromStats(line({ position: 'GK', goals: 1 }))).toBe(2 + 6)
        expect(pointsFromStats(line({ position: 'DEF', goals: 1 }))).toBe(2 + 6)
        expect(pointsFromStats(line({ position: 'MID', goals: 1 }))).toBe(2 + 5)
        expect(pointsFromStats(line({ position: 'FWD', goals: 1 }))).toBe(2 + 4)
    })

    it('an assist is 3', () => {
        expect(pointsFromStats(line({ assists: 2 }))).toBe(2 + 6)
    })

    it('a clean sheet needs 60 minutes: GK/DEF 4, MID 1, FWD 0', () => {
        expect(pointsFromStats(line({ position: 'DEF', cleanSheet: true }))).toBe(2 + 4)
        expect(pointsFromStats(line({ position: 'GK', cleanSheet: true }))).toBe(2 + 4)
        expect(pointsFromStats(line({ position: 'MID', cleanSheet: true }))).toBe(2 + 1)
        expect(pointsFromStats(line({ position: 'FWD', cleanSheet: true }))).toBe(2)
        expect(pointsFromStats(line({ position: 'DEF', minutes: 59, cleanSheet: true }))).toBe(1)
    })

    it('goals conceded cost 1 per 2 for GK and DEF only', () => {
        expect(pointsFromStats(line({ position: 'DEF', goalsConceded: 1 }))).toBe(2)
        expect(pointsFromStats(line({ position: 'DEF', goalsConceded: 3 }))).toBe(2 - 1)
        expect(pointsFromStats(line({ position: 'GK', goalsConceded: 4 }))).toBe(2 - 2)
        expect(pointsFromStats(line({ position: 'MID', goalsConceded: 4 }))).toBe(2)
    })

    it('saves score 1 per 3 for goalkeepers only', () => {
        expect(pointsFromStats(line({ position: 'GK', saves: 5 }))).toBe(2 + 1)
        expect(pointsFromStats(line({ position: 'GK', saves: 6 }))).toBe(2 + 2)
        expect(pointsFromStats(line({ position: 'DEF', saves: 6 }))).toBe(2)
    })

    it('cards, own goals and penalties', () => {
        expect(pointsFromStats(line({ yellowCards: 1 }))).toBe(2 - 1)
        expect(pointsFromStats(line({ redCards: 1 }))).toBe(2 - 3)
        expect(pointsFromStats(line({ ownGoals: 1 }))).toBe(2 - 2)
        expect(pointsFromStats(line({ penaltiesMissed: 1 }))).toBe(2 - 2)
        expect(pointsFromStats(line({ position: 'GK', penaltiesSaved: 1 }))).toBe(2 + 5)
    })

    it('defensive contribution: DEF 10 actions, MID and FWD 12, never GK', () => {
        expect(pointsFromStats(line({ position: 'DEF', defensiveActions: 10 }))).toBe(2 + 2)
        expect(pointsFromStats(line({ position: 'DEF', defensiveActions: 9 }))).toBe(2)
        expect(pointsFromStats(line({ position: 'MID', defensiveActions: 12 }))).toBe(2 + 2)
        expect(pointsFromStats(line({ position: 'MID', defensiveActions: 11 }))).toBe(2)
        expect(pointsFromStats(line({ position: 'FWD', defensiveActions: 12 }))).toBe(2 + 2)
        expect(pointsFromStats(line({ position: 'GK', defensiveActions: 20 }))).toBe(2)
    })

    it('a realistic defender line adds up', () => {
        const defender = line({ position: 'DEF', cleanSheet: true, goals: 1, defensiveActions: 11 })

        expect(pointsFromStats(defender)).toBe(2 + 4 + 6 + 2)
    })
})

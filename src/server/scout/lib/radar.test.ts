import { describe, expect, it } from 'vitest'

import { MIN_RADAR_MINUTES } from './params'
import { radarProfiles, seasonMetrics } from './radar'

import type { SeasonLine, SeasonMetrics } from './radar'
import type { Position } from '@/server/prediction/lib/scoring-rules'

const blank: SeasonMetrics['per90'] = {
    goals: null,
    xg: null,
    assists: null,
    xa: null,
    shotsOn: null,
    keyPasses: null,
    defActions: null,
    duelWinRate: null,
    cleanSheetRate: null,
    goalInvolvements: null,
    saves: null,
    goalsConceded: null,
    penaltySaved: null,
}

const metrics = (minutes: number, per90: Partial<SeasonMetrics['per90']>): SeasonMetrics => ({
    minutes,
    appearances: 10,
    per90: { ...blank, ...per90 },
})

const line = (overrides: Partial<SeasonLine> = {}): SeasonLine => ({
    playerId: 'p1',
    minutes: 90,
    goals: 0,
    assists: 0,
    shotsOn: 0,
    passesKey: 0,
    defActions: 0,
    duelsTotal: 0,
    duelsWon: 0,
    saves: 0,
    goalsConceded: 0,
    penaltySaved: 0,
    cleanSheet: false,
    ...overrides,
})

const players = (position: Position, values: number[], key: 'goals' | 'goalsConceded', minutes = 900) =>
    values.map((v, i) => ({ id: `${position}${i + 1}`, position, metrics: metrics(minutes, { [key]: v }) }))

const axis = (map: ReturnType<typeof radarProfiles>, id: string, key: string) =>
    map.get(id)?.axes.find((a) => a.key === key)

describe('radarProfiles', () => {
    it('ranks a player among peers of the same position by percentile', () => {
        const map = radarProfiles(players('FWD', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'goals'))

        expect(axis(map, 'FWD10', 'goals')?.percentile).toBe(95)
        expect(axis(map, 'FWD1', 'goals')?.percentile).toBe(5)
    })

    it('flips a lower-is-better axis so fewer goals conceded ranks higher', () => {
        const map = radarProfiles(players('GK', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'goalsConceded'))

        expect(axis(map, 'GK1', 'goalsConceded')?.percentile).toBe(95)
        expect(axis(map, 'GK10', 'goalsConceded')?.percentile).toBe(5)
    })

    it('marks a player under the minutes threshold as low data and keeps him out of the peers', () => {
        const peers = players('FWD', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'goals')
        const rookie = {
            id: 'rookie',
            position: 'FWD' as const,
            metrics: metrics(MIN_RADAR_MINUTES - 1, { goals: 100 }),
        }
        const map = radarProfiles([...peers, rookie])
        const profile = map.get('rookie')

        expect(profile?.lowData).toBe(true)
        expect(profile?.reason).toMatch(/minutes/)
        expect(profile?.axes.every((a) => a.percentile === null)).toBe(true)
        expect(axis(map, 'rookie', 'goals')?.value).toBe(100)
        expect(axis(map, 'FWD10', 'goals')?.percentile).toBe(95)
    })

    it('gives no percentiles when a position has fewer than ten eligible peers', () => {
        const map = radarProfiles(players('MID', [1, 2, 3, 4, 5, 6, 7, 8, 9], 'goals'))
        const profile = map.get('MID9')

        expect(profile?.lowData).toBe(true)
        expect(profile?.reason).toMatch(/peers/)
        expect(profile?.axes.every((a) => a.percentile === null)).toBe(true)
    })

    it('leaves an axis without value unranked', () => {
        const map = radarProfiles(players('FWD', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'goals'))

        expect(axis(map, 'FWD5', 'xg')?.value).toBeNull()
        expect(axis(map, 'FWD5', 'xg')?.percentile).toBeNull()
    })
})

describe('seasonMetrics', () => {
    it('scales totals to per-90 values', () => {
        const m = seasonMetrics([line({ minutes: 90, goals: 1 }), line({ minutes: 90, goals: 1 })], null)

        expect(m.minutes).toBe(180)
        expect(m.appearances).toBe(2)
        expect(m.per90.goals).toBe(1)
    })

    it('gives no duel win rate without duels', () => {
        expect(seasonMetrics([line()], null).per90.duelWinRate).toBeNull()
        expect(seasonMetrics([line({ duelsTotal: 4, duelsWon: 3 })], null).per90.duelWinRate).toBe(0.75)
    })

    it('counts clean sheets only over matches of 60 minutes or more', () => {
        const m = seasonMetrics(
            [line({ cleanSheet: true }), line({ minutes: 30, cleanSheet: true }), line()],
            null,
        )

        expect(m.per90.cleanSheetRate).toBe(0.5)
        expect(seasonMetrics([line({ minutes: 30 })], null).per90.cleanSheetRate).toBeNull()
    })

    it('has no xG or xA without FPL totals, never zero', () => {
        expect(seasonMetrics([line()], null).per90.xg).toBeNull()
        expect(seasonMetrics([line()], { xg: null, xa: 1.8 }).per90.xg).toBeNull()
        expect(seasonMetrics([line()], { xg: null, xa: 1.8 }).per90.xa).toBe(1.8)
    })

    it('has no per-90 values without minutes', () => {
        const m = seasonMetrics([line({ minutes: 0, goals: 0 })], { xg: 1, xa: 1 })

        expect(Object.values(m.per90).every((v) => v === null)).toBe(true)
    })
})

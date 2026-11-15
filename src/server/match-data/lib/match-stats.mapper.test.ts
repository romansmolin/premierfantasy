import { describe, expect, it } from 'vitest'

import { mapMatchPosition, mapPlayerMatchStats } from './match-stats.mapper'

import type { ApiPlayerEntry } from './match-stats.types'

const entry = (stats: Partial<ApiPlayerEntry['statistics'][number]> = {}): ApiPlayerEntry => ({
    player: { id: 1, name: 'M. Salah' },
    statistics: [
        {
            games: { minutes: 90, position: 'F', rating: '7.3', substitute: false },
            shots: { total: 4, on: 2 },
            goals: { total: 1, conceded: 0, assists: 1, saves: null },
            passes: { total: 30, key: 3, accuracy: '85' },
            tackles: { total: 2, blocks: 1, interceptions: 1 },
            duels: { total: 10, won: 6 },
            dribbles: { attempts: 5, success: 3 },
            fouls: { drawn: 2, committed: 1 },
            cards: { yellow: 1, red: 0 },
            penalty: { won: 1, commited: 0, scored: 1, missed: 0, saved: null },
            ...stats,
        },
    ],
})

describe('mapPlayerMatchStats', () => {
    it('maps all numeric fields and treats null as 0', () => {
        const result = mapPlayerMatchStats(entry())

        expect(result).toMatchObject({
            minutes: 90,
            goals: 1,
            assists: 1,
            saves: 0,
            goalsConceded: 0,
            shotsTotal: 4,
            shotsOn: 2,
            passesTotal: 30,
            passesKey: 3,
            tackles: 2,
            blocks: 1,
            interceptions: 1,
            duelsTotal: 10,
            duelsWon: 6,
            dribblesAttempts: 5,
            dribblesSuccess: 3,
            foulsDrawn: 2,
            foulsCommitted: 1,
            yellowCards: 1,
            redCards: 0,
            penaltyWon: 1,
            penaltyScored: 1,
            penaltySaved: 0,
            position: 'FWD',
            isSubstitute: false,
        })
    })

    it('parses rating "7.3" to 7.3 and a null rating to null', () => {
        expect(mapPlayerMatchStats(entry()).rating).toBe(7.3)
        expect(
            mapPlayerMatchStats(
                entry({ games: { minutes: 0, position: 'M', rating: null, substitute: true } }),
            ).rating,
        ).toBeNull()
    })

    it('parses passes.accuracy "85" to 85 and null to null', () => {
        expect(mapPlayerMatchStats(entry()).passAccuracy).toBe(85)
        expect(
            mapPlayerMatchStats(entry({ passes: { total: 0, key: 0, accuracy: null } })).passAccuracy,
        ).toBeNull()
    })

    it('reads penalty.commited into penaltyCommitted', () => {
        const result = mapPlayerMatchStats(
            entry({ penalty: { won: 0, commited: 2, scored: 0, missed: 0, saved: 0 } }),
        )

        expect(result.penaltyCommitted).toBe(2)
    })

    it('an unused substitute has minutes 0', () => {
        const result = mapPlayerMatchStats(
            entry({ games: { minutes: null, position: 'D', rating: null, substitute: true } }),
        )

        expect(result.minutes).toBe(0)
        expect(result.isSubstitute).toBe(true)
    })
})

describe('mapMatchPosition', () => {
    it('maps G/D/M/F and returns null for anything else', () => {
        expect(['G', 'D', 'M', 'F'].map(mapMatchPosition)).toEqual(['GK', 'DEF', 'MID', 'FWD'])
        expect(mapMatchPosition(null)).toBeNull()
        expect(mapMatchPosition('X')).toBeNull()
    })
})

import { describe, expect, it } from 'vitest'

import { matchPlayers } from './player-matcher'

import type { FplElement } from './fpl.types'
import type { OurPlayer } from './player-matcher'

const el = (
    id: number,
    first: string,
    second: string,
    web: string,
    team: number,
    elementType: number,
): FplElement => ({
    id,
    code: id,
    web_name: web,
    first_name: first,
    second_name: second,
    team,
    element_type: elementType,
    now_cost: 50,
    status: 'a',
    chance_of_playing_next_round: null,
    news: '',
    minutes: 900,
})

const our = (id: string, name: string, position: OurPlayer['position'], teamId: string): OurPlayer => ({
    id,
    name,
    position,
    teamId,
})

const teamMap = new Map([
    [1, 't-ars'],
    [2, 't-mci'],
])

describe('matchPlayers', () => {
    it('matches "David Raya Martín" to "D. Raya" with confidence 0.8', () => {
        const result = matchPlayers(
            [el(1, 'David', 'Raya Martín', 'Raya', 1, 1)],
            [our('p1', 'D. Raya', 'GK', 't-ars')],
            teamMap,
        )

        expect(result.matched).toEqual([{ fplId: 1, playerId: 'p1', confidence: 0.8 }])
    })

    it('matches identical full names with confidence 1', () => {
        const result = matchPlayers(
            [el(2, 'Erling', 'Haaland', 'Haaland', 2, 4)],
            [our('p2', 'Erling Haaland', 'FWD', 't-mci')],
            teamMap,
        )

        expect(result.matched).toEqual([{ fplId: 2, playerId: 'p2', confidence: 1 }])
    })

    it('two of our Gabriels at one club and position are ambiguous, not matched', () => {
        const result = matchPlayers(
            [el(3, 'Gabriel', 'Magalhães', 'Gabriel', 1, 2)],
            [our('a', 'Gabriel', 'DEF', 't-ars'), our('b', 'Gabriel', 'DEF', 't-ars')],
            teamMap,
        )

        expect(result.matched).toEqual([])
        expect(result.ambiguous).toHaveLength(1)
        expect(result.ambiguous[0].fplId).toBe(3)
        expect(result.ambiguous[0].candidates.map((c) => c.playerId).sort()).toEqual(['a', 'b'])
    })

    it('does not confuse the same surname at different clubs', () => {
        const result = matchPlayers(
            [el(4, 'David', 'Silva', 'Silva', 2, 3)],
            [our('arsenal-silva', 'B. Silva', 'MID', 't-ars'), our('city-silva', 'D. Silva', 'MID', 't-mci')],
            teamMap,
        )

        expect(result.matched).toEqual([{ fplId: 4, playerId: 'city-silva', confidence: 0.8 }])
    })

    it('matches across outfield positions with lower confidence when no same-position candidate exists', () => {
        const result = matchPlayers(
            [el(5, 'Bukayo', 'Saka', 'Saka', 1, 3)],
            [our('saka', 'B. Saka', 'FWD', 't-ars')],
            teamMap,
        )

        expect(result.matched).toEqual([{ fplId: 5, playerId: 'saka', confidence: 0.6 }])
    })

    it('prefers a same-position candidate over a cross-position one', () => {
        const result = matchPlayers(
            [el(5, 'Matheus', 'Nunes', 'Nunes', 2, 2)],
            [our('same-pos', 'M. Nunes', 'DEF', 't-mci'), our('cross-pos', 'Matheus Nunes', 'MID', 't-mci')],
            teamMap,
        )

        expect(result.matched).toEqual([{ fplId: 5, playerId: 'same-pos', confidence: 0.8 }])
    })

    it('never matches a goalkeeper with an outfield player or the other way round', () => {
        const toKeeper = matchPlayers(
            [el(5, 'Erling', 'Haaland', 'Haaland', 2, 1)],
            [our('p2', 'Erling Haaland', 'FWD', 't-mci')],
            teamMap,
        )
        const toOutfield = matchPlayers(
            [el(6, 'Erling', 'Haaland', 'Haaland', 2, 4)],
            [our('p3', 'Erling Haaland', 'GK', 't-mci')],
            teamMap,
        )

        expect(toKeeper.matched).toEqual([])
        expect(toKeeper.unmatched).toEqual([5])
        expect(toOutfield.matched).toEqual([])
    })

    it('does not cross-position match on a single-word surname alone', () => {
        const result = matchPlayers(
            [el(5, 'John', 'Smith', 'Smith', 1, 3)],
            [our('departed', 'Smith', 'DEF', 't-ars')],
            teamMap,
        )

        expect(result.matched).toEqual([])
        expect(result.unmatched).toEqual([5])
    })

    it('still matches a single-word name in the same position', () => {
        const result = matchPlayers(
            [el(5, 'John', 'Smith', 'Smith', 1, 2)],
            [our('same', 'Smith', 'DEF', 't-ars')],
            teamMap,
        )

        expect(result.matched).toEqual([{ fplId: 5, playerId: 'same', confidence: 1 }])
    })

    it('accepts a shortened first name such as Josh for Joshua', () => {
        const result = matchPlayers(
            [el(8, 'Josh', 'King', 'King', 1, 3)],
            [our('jk', 'Joshua King', 'MID', 't-ars')],
            teamMap,
        )

        expect(result.matched).toEqual([{ fplId: 8, playerId: 'jk', confidence: 0.8 }])
    })

    it('does not accept a different first name with the same surname', () => {
        const result = matchPlayers(
            [el(9, 'Tom', 'King', 'King', 1, 3)],
            [our('jk', 'Joshua King', 'MID', 't-ars')],
            teamMap,
        )

        expect(result.matched).toEqual([])
    })

    it('a player of an unmapped team is unmatched', () => {
        const result = matchPlayers(
            [el(6, 'Some', 'Body', 'Body', 99, 3)],
            [our('p', 'S. Body', 'MID', 't-ars')],
            teamMap,
        )

        expect(result.unmatched).toEqual([6])
    })

    it('one of our players is never matched to two FPL players', () => {
        const result = matchPlayers(
            [el(7, 'Gabriel', 'Jesus', 'G.Jesus', 1, 4), el(8, 'Gabriel', 'Jesus Junior', 'Jesus', 1, 4)],
            [our('pj', 'Gabriel Jesus', 'FWD', 't-ars')],
            teamMap,
        )

        expect(result.matched).toEqual([{ fplId: 7, playerId: 'pj', confidence: 1 }])
        expect(result.matched.map((m) => m.playerId)).toEqual(['pj'])
        expect(result.unmatched).toEqual([8])
    })

    it('equally good FPL candidates for one of our players are both ambiguous', () => {
        const result = matchPlayers(
            [el(9, 'Joao', 'Silva', 'Silva', 1, 3), el(10, 'Joao', 'Silva Costa', 'Silva', 1, 3)],
            [our('only', 'J. Silva', 'MID', 't-ars')],
            teamMap,
        )

        expect(result.matched).toEqual([])
        expect(result.ambiguous.map((a) => a.fplId).sort((x, y) => x - y)).toEqual([9, 10])
    })
})

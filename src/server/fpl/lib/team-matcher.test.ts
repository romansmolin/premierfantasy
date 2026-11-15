import { describe, expect, it } from 'vitest'

import { matchTeams } from './team-matcher'

import type { FplTeam } from './fpl.types'

const fpl = (id: number, name: string, short = 'XXX'): FplTeam => ({ id, code: id, name, short_name: short })
const ours = (id: string, name: string, shortName = 'YYY') => ({ id, name, shortName })

describe('matchTeams', () => {
    const pairs: [string, string][] = [
        ['Man City', 'Manchester City'],
        ['Man Utd', 'Manchester United'],
        ['Spurs', 'Tottenham'],
        ["Nott'm Forest", 'Nottingham Forest'],
        ['Wolves', 'Wolverhampton Wanderers'],
        ['Newcastle', 'Newcastle United'],
        ['Brighton', 'Brighton & Hove Albion'],
        ['Leeds', 'Leeds United'],
        ['West Ham', 'West Ham United'],
    ]

    it.each(pairs)('matches FPL "%s" to our "%s"', (fplName, ourName) => {
        const result = matchTeams([fpl(1, fplName)], [ours('t1', ourName)])

        expect(result.map.get(1)).toBe('t1')
        expect(result.unmatched).toEqual([])
    })

    it('matches identical names directly', () => {
        expect(matchTeams([fpl(5, 'Arsenal')], [ours('a', 'Arsenal')]).map.get(5)).toBe('a')
    })

    it('falls back to the short name when the names do not match', () => {
        const result = matchTeams([fpl(7, 'Some Club', 'SMC')], [ours('s', 'Other Name', 'SMC')])

        expect(result.map.get(7)).toBe('s')
    })

    it('returns an unknown club in unmatched', () => {
        const result = matchTeams([fpl(9, 'Nowhere FC')], [ours('a', 'Arsenal')])

        expect(result.map.size).toBe(0)
        expect(result.unmatched.map((t) => t.id)).toEqual([9])
    })
})

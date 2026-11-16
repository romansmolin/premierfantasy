import { describe, expect, it } from 'vitest'

import { formationFromStarters, formationLabel, formationOptions, slotsOf } from './formations'
import { DEFAULT_SQUAD_RULES } from './rules'

import type { SquadPlayerInfo } from './rules'

describe('formationOptions', () => {
    it('lists exactly the FPL formations', () => {
        expect(formationOptions(DEFAULT_SQUAD_RULES).map(formationLabel)).toEqual([
            '3-4-3',
            '3-5-2',
            '4-3-3',
            '4-4-2',
            '4-5-1',
            '5-2-3',
            '5-3-2',
            '5-4-1',
        ])
    })

    it('every option fills the starting XI', () => {
        for (const f of formationOptions(DEFAULT_SQUAD_RULES)) {
            expect(f.def + f.mid + f.fwd + DEFAULT_SQUAD_RULES.positions.GK.maxPlay).toBe(11)
        }
    })
})

describe('slotsOf', () => {
    it('has one goalkeeper slot and the outfield counts', () => {
        expect(slotsOf({ def: 4, mid: 3, fwd: 3 })).toEqual({ GK: 1, DEF: 4, MID: 3, FWD: 3 })
    })
})

describe('formationFromStarters', () => {
    const info = (id: string, position: SquadPlayerInfo['position']): [string, SquadPlayerInfo] => [
        id,
        { playerId: id, position, clubId: 'c', priceTenths: 50 },
    ]

    it('counts outfield starters per position', () => {
        const pool = new Map([
            info('a', 'GK'),
            info('b', 'DEF'),
            info('c', 'DEF'),
            info('d', 'DEF'),
            info('e', 'MID'),
            info('f', 'MID'),
            info('g', 'MID'),
            info('h', 'MID'),
            info('i', 'FWD'),
            info('j', 'FWD'),
            info('k', 'FWD'),
        ])

        expect(formationFromStarters([...pool.keys()], pool)).toEqual({ def: 3, mid: 4, fwd: 3 })
    })

    it('is null when the starters are not a full formation', () => {
        const pool = new Map([info('a', 'GK'), info('b', 'DEF')])

        expect(formationFromStarters(['a', 'b'], pool)).toBeNull()
    })
})

import { describe, expect, it } from 'vitest'

import { DEFAULT_SQUAD_RULES, formationOf, validateSquad } from './rules'

import type { Position, SquadDraft, SquadPlayerInfo } from './rules'

const rules = DEFAULT_SQUAD_RULES

/** 15 players over 8 clubs (max 2 per club), each priced 6.0 = 60 tenths unless overridden. */
function pool(): Map<string, SquadPlayerInfo> {
    const spec: [Position, number][] = [
        ['GK', 2],
        ['DEF', 5],
        ['MID', 5],
        ['FWD', 3],
    ]
    const map = new Map<string, SquadPlayerInfo>()
    let n = 0

    for (const [position, count] of spec) {
        for (let i = 0; i < count; i += 1) {
            n += 1
            map.set(`p${n}`, { playerId: `p${n}`, position, clubId: `c${(n % 8) + 1}`, priceTenths: 60 })
        }
    }

    return map
}

/** GK p1 starts; DEF p3-p5; MID p8-p11; FWD p13-p15 ( = 3-4-3 ); bench p2 (GK), p6, p7 (DEF), p12 (MID). */
const draft = (): SquadDraft => ({
    starters: ['p1', 'p3', 'p4', 'p5', 'p8', 'p9', 'p10', 'p11', 'p13', 'p14', 'p15'],
    bench: ['p2', 'p6', 'p7', 'p12'],
    captainId: 'p15',
    viceCaptainId: 'p14',
})

describe('validateSquad', () => {
    it('accepts a correct squad and reports the formation and cost', () => {
        const result = validateSquad(draft(), pool(), rules)

        expect(result.errors).toEqual([])
        expect(result.valid).toBe(true)
        expect(result.formation).toBe('3-4-3')
        expect(result.totalTenths).toBe(900)
        expect(result.budgetChecked).toBe(true)
    })

    it('rejects a squad that is not 15 distinct players', () => {
        const d = draft()

        d.bench = ['p2', 'p6', 'p7', 'p3']

        expect(validateSquad(d, pool(), rules).valid).toBe(false)
    })

    it('rejects wrong position counts (e.g. 3 goalkeepers)', () => {
        const p = pool()

        p.set('p12', { playerId: 'p12', position: 'GK', clubId: 'c1', priceTenths: 60 })

        const result = validateSquad(draft(), p, rules)

        expect(result.valid).toBe(false)
        expect(result.errors.join(' ')).toMatch(/GK/)
    })

    it('rejects more than 3 players from one club', () => {
        const p = pool()

        for (const id of ['p3', 'p4', 'p5', 'p8'])
            p.set(id, { ...(p.get(id) as SquadPlayerInfo), clubId: 'cX' })

        const result = validateSquad(draft(), p, rules)

        expect(result.valid).toBe(false)
        expect(result.errors.join(' ')).toMatch(/club/i)
    })

    it('allows exactly 3 from one club', () => {
        const p = pool()

        for (const id of ['p3', 'p4', 'p5']) p.set(id, { ...(p.get(id) as SquadPlayerInfo), clubId: 'cX' })

        expect(validateSquad(draft(), p, rules).valid).toBe(true)
    })

    it('accepts exactly 100.0m and rejects anything above', () => {
        const p = pool()

        p.set('p1', { ...(p.get('p1') as SquadPlayerInfo), priceTenths: 160 }) // total 1000

        expect(validateSquad(draft(), p, rules).valid).toBe(true)

        p.set('p1', { ...(p.get('p1') as SquadPlayerInfo), priceTenths: 161 }) // total 1001

        const over = validateSquad(draft(), p, rules)

        expect(over.valid).toBe(false)
        expect(over.errors.join(' ')).toMatch(/budget/i)
    })

    it('skips the budget check when a price is unknown and says so', () => {
        const p = pool()

        p.set('p1', { ...(p.get('p1') as SquadPlayerInfo), priceTenths: null })

        const result = validateSquad(draft(), p, rules)

        expect(result.budgetChecked).toBe(false)
        expect(result.valid).toBe(true)
    })

    it('rejects an over-budget squad even when another price is unknown', () => {
        const p = pool()

        p.set('p1', { ...(p.get('p1') as SquadPlayerInfo), priceTenths: null })
        p.set('p2', { ...(p.get('p2') as SquadPlayerInfo), priceTenths: 1000 })

        const result = validateSquad(draft(), p, rules)

        expect(result.budgetChecked).toBe(false)
        expect(result.valid).toBe(false)
        expect(result.errors.join(' ')).toMatch(/budget/i)
    })

    it('rejects starting XIs outside the formation limits', () => {
        const d: SquadDraft = {
            starters: ['p1', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p13'], // 5-4-1... p3-p7 DEF=5, MID 4 (p8-p11), FWD 1 -> valid 5-4-1
            bench: ['p2', 'p12', 'p14', 'p15'],
            captainId: 'p13',
            viceCaptainId: 'p11',
        }

        expect(validateSquad(d, pool(), rules).valid).toBe(true)

        const bad: SquadDraft = {
            ...d,
            starters: ['p1', 'p3', 'p4', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15'],
            bench: ['p2', 'p5', 'p6', 'p7'],
        }

        // 2 DEF only
        expect(validateSquad(bad, pool(), rules).errors.join(' ')).toMatch(/DEF/)
    })

    it('needs exactly one goalkeeper in the starting XI', () => {
        const d = draft()

        d.starters = d.starters.map((id) => (id === 'p1' ? 'p2' : id))
        d.bench = ['p1', 'p6', 'p7', 'p12']

        expect(validateSquad(d, pool(), rules).valid).toBe(true)

        const two = draft()

        two.starters = [...two.starters.slice(0, 10), 'p2']
        two.bench = ['p15', 'p6', 'p7', 'p12']
        two.captainId = 'p14'
        two.viceCaptainId = 'p13'

        expect(validateSquad(two, pool(), rules).valid).toBe(false)
    })

    it('needs a captain and a different vice-captain from the starting XI', () => {
        const noCaptain = { ...draft(), captainId: '' }
        const same = { ...draft(), viceCaptainId: 'p15' }
        const benched = { ...draft(), captainId: 'p2' }

        expect(validateSquad(noCaptain, pool(), rules).valid).toBe(false)
        expect(validateSquad(same, pool(), rules).errors.join(' ')).toMatch(/different/i)
        expect(validateSquad(benched, pool(), rules).errors.join(' ')).toMatch(/starting/i)
    })

    it('rejects players that are not in the pool', () => {
        const d = draft()

        d.bench = ['p2', 'p6', 'p7', 'ghost']

        expect(validateSquad(d, pool(), rules).valid).toBe(false)
    })
})

describe('formationOf', () => {
    it('lists defenders-midfielders-forwards of the starting XI', () => {
        const p = pool()

        expect(formationOf(draft().starters, p)).toBe('3-4-3')
    })
})

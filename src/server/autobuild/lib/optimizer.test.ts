import { describe, expect, it } from 'vitest'

import { DEFAULT_SQUAD_RULES, validateSquad } from '@/entities/squad/model/rules'
import type { Position, SquadRules } from '@/entities/squad/model/rules'

import { bestSquadValue, InfeasibleError, optimizeSquad } from './optimizer'

import type { Candidate } from './optimizer'

/** Small deterministic generator. */
function rng(seed: number) {
    let s = seed

    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296

        return s / 4294967296
    }
}

function randomPool(seed: number, perPosition: Record<Position, number>, clubs = 5): Candidate[] {
    const r = rng(seed)
    const result: Candidate[] = []
    let n = 0

    for (const position of Object.keys(perPosition) as Position[]) {
        for (let i = 0; i < perPosition[position]; i += 1) {
            n += 1
            result.push({
                id: `p${n}`,
                position,
                clubId: `c${Math.floor(r() * clubs)}`,
                priceTenths: 40 + Math.floor(r() * 90),
                points: Math.round(r() * 80) / 10,
            })
        }
    }

    return result
}

const MINI: SquadRules = {
    squadSize: 7,
    startingSize: 5,
    budgetTenths: 520,
    teamLimit: 2,
    positions: {
        GK: { squadSelect: 1, minPlay: 1, maxPlay: 1 },
        DEF: { squadSelect: 2, minPlay: 1, maxPlay: 2 },
        MID: { squadSelect: 2, minPlay: 1, maxPlay: 2 },
        FWD: { squadSelect: 2, minPlay: 1, maxPlay: 2 },
    },
}

function combinations<T>(items: T[], k: number): T[][] {
    if (k === 0) return [[]]

    if (items.length < k) return []

    const [head, ...rest] = items

    return [...combinations(rest, k - 1).map((c) => [head, ...c]), ...combinations(rest, k)]
}

/** Exhaustive optimum of the same objective for tiny instances. */
function bruteForce(pool: Candidate[], rules: SquadRules): number | null {
    const by = (position: Position) => pool.filter((c) => c.position === position)
    let best: number | null = null

    for (const gk of combinations(by('GK'), rules.positions.GK.squadSelect)) {
        for (const def of combinations(by('DEF'), rules.positions.DEF.squadSelect)) {
            for (const mid of combinations(by('MID'), rules.positions.MID.squadSelect)) {
                for (const fwd of combinations(by('FWD'), rules.positions.FWD.squadSelect)) {
                    const squad = [...gk, ...def, ...mid, ...fwd]
                    const cost = squad.reduce((s, c) => s + c.priceTenths, 0)
                    const perClub = new Map<string, number>()

                    for (const c of squad) perClub.set(c.clubId, (perClub.get(c.clubId) ?? 0) + 1)

                    if (cost > rules.budgetTenths || [...perClub.values()].some((n) => n > rules.teamLimit))
                        continue

                    const value = bestSquadValue(squad, rules)

                    if (best === null || value > best) best = value
                }
            }
        }
    }

    return best
}

describe('optimizeSquad', () => {
    it('finds the exhaustive optimum on small random instances', () => {
        let compared = 0

        for (let seed = 1; seed <= 25; seed += 1) {
            const pool = randomPool(seed, { GK: 3, DEF: 5, MID: 5, FWD: 4 })
            const optimum = bruteForce(pool, MINI)

            if (optimum === null) continue

            const result = optimizeSquad({ candidates: pool, rules: MINI, locked: [], excluded: [] })

            expect(result.objective).toBeCloseTo(optimum, 9)
            compared += 1
        }

        expect(compared).toBeGreaterThan(10)
    })

    it('returns a squad that passes the FPL validation on a realistic pool, quickly', () => {
        const pool = randomPool(7, { GK: 70, DEF: 220, MID: 300, FWD: 100 }, 20)
        const started = Date.now()
        const result = optimizeSquad({
            candidates: pool,
            rules: DEFAULT_SQUAD_RULES,
            locked: [],
            excluded: [],
        })
        const infos = new Map(
            pool.map((c) => [
                c.id,
                { playerId: c.id, position: c.position, clubId: c.clubId, priceTenths: c.priceTenths },
            ]),
        )
        const validation = validateSquad(
            {
                starters: result.starters,
                bench: result.bench,
                captainId: result.captainId,
                viceCaptainId: result.viceCaptainId,
            },
            infos,
            DEFAULT_SQUAD_RULES,
        )

        expect(validation.errors).toEqual([])
        expect(result.totalTenths).toBeLessThanOrEqual(1000)
        expect(Date.now() - started).toBeLessThan(5000)
    })

    it('is deterministic', () => {
        const pool = randomPool(3, { GK: 20, DEF: 60, MID: 80, FWD: 30 })
        const a = optimizeSquad({ candidates: pool, rules: DEFAULT_SQUAD_RULES, locked: [], excluded: [] })
        const b = optimizeSquad({ candidates: pool, rules: DEFAULT_SQUAD_RULES, locked: [], excluded: [] })

        expect(a).toEqual(b)
    })

    it('keeps locked players and never uses excluded ones', () => {
        const pool = randomPool(11, { GK: 20, DEF: 60, MID: 80, FWD: 30 })
        const top = [...pool].sort((x, y) => y.points - x.points)
        const excluded = top.slice(0, 5).map((c) => c.id)
        const worstMid = [...pool].filter((c) => c.position === 'MID').sort((x, y) => x.points - y.points)[0]
        const result = optimizeSquad({
            candidates: pool,
            rules: DEFAULT_SQUAD_RULES,
            locked: [worstMid.id],
            excluded,
        })
        const chosen = [...result.starters, ...result.bench]

        expect(chosen).toContain(worstMid.id)
        expect(chosen.some((id) => excluded.includes(id))).toBe(false)
    })

    it('a better pool never gives a worse objective than a restricted one', () => {
        const pool = randomPool(5, { GK: 20, DEF: 60, MID: 80, FWD: 30 })
        const full = optimizeSquad({ candidates: pool, rules: DEFAULT_SQUAD_RULES, locked: [], excluded: [] })
        const restricted = optimizeSquad({
            candidates: pool,
            rules: DEFAULT_SQUAD_RULES,
            locked: [],
            excluded: [full.captainId],
        })

        expect(full.objective).toBeGreaterThanOrEqual(restricted.objective - 1e-9)
    })

    it('fails clearly when locked players break the rules', () => {
        const pool = randomPool(2, { GK: 10, DEF: 30, MID: 30, FWD: 15 })
        const keepers = pool
            .filter((c) => c.position === 'GK')
            .slice(0, 3)
            .map((c) => c.id)

        expect(() =>
            optimizeSquad({ candidates: pool, rules: DEFAULT_SQUAD_RULES, locked: keepers, excluded: [] }),
        ).toThrow(InfeasibleError)
    })

    it('fails clearly when the budget cannot cover any legal squad', () => {
        const pool = randomPool(4, { GK: 10, DEF: 30, MID: 30, FWD: 15 }).map((c) => ({
            ...c,
            priceTenths: 200,
        }))

        expect(() =>
            optimizeSquad({ candidates: pool, rules: DEFAULT_SQUAD_RULES, locked: [], excluded: [] }),
        ).toThrow(InfeasibleError)
    })

    it('fails clearly when a position has too few candidates', () => {
        const pool = randomPool(6, { GK: 1, DEF: 30, MID: 30, FWD: 15 })

        expect(() =>
            optimizeSquad({ candidates: pool, rules: DEFAULT_SQUAD_RULES, locked: [], excluded: [] }),
        ).toThrow(InfeasibleError)
    })
})

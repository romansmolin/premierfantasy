import type { Position, SquadRules } from '@/entities/squad/model/rules'

export interface Candidate {
    id: string
    position: Position
    clubId: string
    priceTenths: number
    /** Expected FPL points next gameweek (calibrated, never negative). */
    points: number
}

export class InfeasibleError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'InfeasibleError'
    }
}

export interface OptimizeInput {
    candidates: Candidate[]
    rules: SquadRules
    /** Players that must be in the squad. */
    locked: string[]
    /** Players that must not be in the squad. */
    excluded: string[]
}

export interface OptimizeResult {
    starters: string[]
    bench: string[]
    captainId: string
    viceCaptainId: string
    totalTenths: number
    /** Expected points of the starting XI with the captain counted twice. */
    expectedXi: number
    /** What the search maximised: expectedXi + BENCH_WEIGHT × bench points. */
    objective: number
}

/** The bench matters a little (injuries, rotation) but far less than the XI. */
export const BENCH_WEIGHT = 0.1

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD']
const TOP_PER_POSITION = 40
const CHEAPEST_PER_POSITION = 10
const PAIR_TOP = 15
const PAIR_CHEAP = 8
const MAX_PASSES = 12
/** Perturb-and-climb rounds after the first local optimum; fixed so the result is the same on every machine. */
const RESTARTS_LARGE = 18
/** Small pools are cheap to search, so they get many more rounds. */
const RESTARTS_SMALL = 200
const SMALL_POOL = 100

const byPointsDesc = (a: Candidate, b: Candidate) => b.points - a.points || a.id.localeCompare(b.id)

/** Best starting XI of a squad under the formation limits; null when the squad cannot field one. */
export function bestXi(
    squad: Candidate[],
    rules: SquadRules,
): { starters: Candidate[]; value: number } | null {
    const sorted = Object.fromEntries(
        POSITIONS.map((p) => [p, squad.filter((c) => c.position === p).sort(byPointsDesc)]),
    ) as Record<Position, Candidate[]>
    const prefix = (position: Position, n: number) =>
        sorted[position].slice(0, n).reduce((sum, c) => sum + c.points, 0)
    let best: { counts: Record<Position, number>; value: number } | null = null

    const range = (position: Position) => {
        const { minPlay, maxPlay } = rules.positions[position]

        return Array.from(
            { length: Math.min(maxPlay, sorted[position].length) - minPlay + 1 },
            (_, i) => minPlay + i,
        ).filter((n) => n >= 0)
    }

    for (const gk of range('GK')) {
        for (const def of range('DEF')) {
            for (const mid of range('MID')) {
                const fwd = rules.startingSize - gk - def - mid
                const { minPlay, maxPlay } = rules.positions.FWD

                if (fwd < minPlay || fwd > maxPlay || fwd > sorted.FWD.length) continue

                const value = prefix('GK', gk) + prefix('DEF', def) + prefix('MID', mid) + prefix('FWD', fwd)

                if (best === null || value > best.value)
                    best = { counts: { GK: gk, DEF: def, MID: mid, FWD: fwd }, value }
            }
        }
    }

    if (best === null) return null

    const counts = best.counts

    return { starters: POSITIONS.flatMap((p) => sorted[p].slice(0, counts[p])), value: best.value }
}

/** Objective of a squad: best XI + captain bonus + a small weight on the bench. */
export function bestSquadValue(squad: Candidate[], rules: SquadRules): number {
    const xi = bestXi(squad, rules)

    if (!xi) return -Infinity

    const total = squad.reduce((sum, c) => sum + c.points, 0)
    const captain = Math.max(...xi.starters.map((c) => c.points))

    return xi.value + captain + BENCH_WEIGHT * (total - xi.value)
}

const cost = (squad: Candidate[]) => squad.reduce((sum, c) => sum + c.priceTenths, 0)

function clubsOk(squad: Candidate[], limit: number): boolean {
    const counts = new Map<string, number>()

    for (const c of squad) {
        const n = (counts.get(c.clubId) ?? 0) + 1

        if (n > limit) return false

        counts.set(c.clubId, n)
    }

    return true
}

const feasible = (squad: Candidate[], rules: SquadRules) =>
    cost(squad) <= rules.budgetTenths && clubsOk(squad, rules.teamLimit)

function climb(start: Candidate[], pool: Candidate[], rules: SquadRules, locked: Set<string>): Candidate[] {
    let squad = start
    let value = bestSquadValue(squad, rules)
    const inSquad = (id: string, s: Candidate[]) => s.some((c) => c.id === id)
    const wide = (position: Position) => pool.filter((c) => c.position === position)

    const narrow = (position: Position) => {
        const all = wide(position)

        return [
            ...new Set([
                ...[...all].sort(byPointsDesc).slice(0, PAIR_TOP),
                ...[...all].sort((a, b) => a.priceTenths - b.priceTenths).slice(0, PAIR_CHEAP),
            ]),
        ]
    }

    for (let pass = 0; pass < MAX_PASSES; pass += 1) {
        let improved = false
        let bestMove: { squad: Candidate[]; value: number } | null = null

        for (let i = 0; i < squad.length; i += 1) {
            if (locked.has(squad[i].id)) continue

            for (const c of wide(squad[i].position)) {
                if (inSquad(c.id, squad)) continue

                const next = squad.map((s, k) => (k === i ? c : s))

                if (!feasible(next, rules)) continue

                const v = bestSquadValue(next, rules)

                if (v > (bestMove?.value ?? value) + 1e-12) bestMove = { squad: next, value: v }
            }
        }

        if (bestMove) {
            squad = bestMove.squad
            value = bestMove.value
            improved = true
        } else {
            // No single swap helps: try changing two players at once (e.g. downgrade one to afford an upgrade).
            for (let i = 0; i < squad.length && !improved; i += 1) {
                if (locked.has(squad[i].id)) continue

                for (let j = i + 1; j < squad.length; j += 1) {
                    if (locked.has(squad[j].id)) continue

                    for (const a of narrow(squad[i].position)) {
                        if (inSquad(a.id, squad)) continue

                        for (const b of narrow(squad[j].position)) {
                            if (inSquad(b.id, squad) || b.id === a.id) continue

                            const next = squad.map((s, k) => (k === i ? a : k === j ? b : s))

                            if (!feasible(next, rules)) continue

                            const v = bestSquadValue(next, rules)

                            if (v > (bestMove?.value ?? value) + 1e-12) bestMove = { squad: next, value: v }
                        }
                    }
                }
            }

            if (bestMove) {
                squad = bestMove.squad
                value = bestMove.value
                improved = true
            }
        }

        if (!improved) break
    }

    return squad
}

/** Fills the squad with locked players, then candidates in the given order while budget and club limits still allow a full squad. */
function construct(
    lockedPlayers: Candidate[],
    order: Candidate[],
    rules: SquadRules,
    cheapestByPosition: Record<Position, Candidate[]>,
): Candidate[] | null {
    const squad = [...lockedPlayers]
    const need = (position: Position) =>
        rules.positions[position].squadSelect - squad.filter((c) => c.position === position).length

    const completion = (extra: Candidate[]) => {
        let total = 0
        const taken = new Set([...squad, ...extra].map((c) => c.id))

        for (const position of POSITIONS) {
            const remaining =
                rules.positions[position].squadSelect -
                [...squad, ...extra].filter((c) => c.position === position).length
            const cheapest = cheapestByPosition[position]
                .filter((c) => !taken.has(c.id))
                .slice(0, Math.max(0, remaining))

            if (cheapest.length < remaining) return Infinity

            total += cheapest.reduce((sum, c) => sum + c.priceTenths, 0)
        }

        return total
    }

    for (const c of order) {
        if (squad.length >= rules.squadSize) break

        if (need(c.position) <= 0 || squad.some((s) => s.id === c.id)) continue

        if (!clubsOk([...squad, c], rules.teamLimit)) continue

        if (cost(squad) + c.priceTenths + completion([c]) > rules.budgetTenths) continue

        squad.push(c)
    }

    return squad.length === rules.squadSize && feasible(squad, rules) ? squad : null
}

/**
 * Backtracking search for any legal squad (budget and club limit); the greedy constructors can miss one when the
 * club limit and the budget interact. Bounded, so it never runs away on a huge pool.
 */
function findAnyFeasible(
    lockedPlayers: Candidate[],
    cheapestByPosition: Record<Position, Candidate[]>,
    rules: SquadRules,
): Candidate[] | null {
    const lockedIds = new Set(lockedPlayers.map((c) => c.id))
    const slots = POSITIONS.flatMap((p) =>
        Array.from(
            { length: rules.positions[p].squadSelect - lockedPlayers.filter((c) => c.position === p).length },
            () => p,
        ),
    )
    const clubCount = new Map<string, number>()
    let nodes = 0

    for (const c of lockedPlayers) clubCount.set(c.clubId, (clubCount.get(c.clubId) ?? 0) + 1)

    const chosen: Candidate[] = []

    const cheapestRemaining = (from: number) => {
        let total = 0
        const used = new Map<Position, number>()

        for (let i = from; i < slots.length; i += 1) {
            const position = slots[i]
            const k = used.get(position) ?? 0
            const list = cheapestByPosition[position].filter((c) => !lockedIds.has(c.id))

            total += list[k]?.priceTenths ?? Infinity
            used.set(position, k + 1)
        }

        return total
    }

    const search = (slot: number, spent: number, minIndex: number): boolean => {
        if (slot === slots.length) return true

        if (++nodes > 200_000) return false

        const position = slots[slot]
        const list = cheapestByPosition[position].filter((c) => !lockedIds.has(c.id))
        const start = slot > 0 && slots[slot - 1] === position ? minIndex : 0

        for (let i = start; i < list.length; i += 1) {
            const c = list[i]
            const n = clubCount.get(c.clubId) ?? 0

            if (n >= rules.teamLimit) continue

            if (spent + c.priceTenths + cheapestRemaining(slot + 1) > rules.budgetTenths) continue

            chosen.push(c)
            clubCount.set(c.clubId, n + 1)

            if (search(slot + 1, spent + c.priceTenths, i + 1)) return true

            chosen.pop()
            clubCount.set(c.clubId, n)
        }

        return false
    }

    return search(0, cost(lockedPlayers), 0) ? [...lockedPlayers, ...chosen] : null
}

/** Near-optimal squad under the FPL rules: swap-based local search from several starts. Deterministic. */
export function optimizeSquad(input: OptimizeInput): OptimizeResult {
    const { rules } = input
    const excluded = new Set(input.excluded)
    const all = input.candidates.filter((c) => !excluded.has(c.id))
    const byId = new Map(all.map((c) => [c.id, c]))
    const lockedPlayers = input.locked.map((id) => byId.get(id))

    if (lockedPlayers.some((c) => !c)) throw new InfeasibleError('A locked player is not available')

    const locked = lockedPlayers as Candidate[]

    for (const position of POSITIONS) {
        if (locked.filter((c) => c.position === position).length > rules.positions[position].squadSelect) {
            throw new InfeasibleError(`Too many locked ${position}`)
        }

        if (all.filter((c) => c.position === position).length < rules.positions[position].squadSelect) {
            throw new InfeasibleError(`Not enough ${position} to build a squad`)
        }
    }

    if (!clubsOk(locked, rules.teamLimit))
        throw new InfeasibleError(`Locked players break the limit of ${rules.teamLimit} per club`)

    const cheapestByPosition = Object.fromEntries(
        POSITIONS.map((p) => [
            p,
            all
                .filter((c) => c.position === p)
                .sort((a, b) => a.priceTenths - b.priceTenths || a.id.localeCompare(b.id)),
        ]),
    ) as Record<Position, Candidate[]>
    const lockedIds = new Set(locked.map((c) => c.id))
    const pool = [
        ...new Set([
            ...locked,
            ...POSITIONS.flatMap((p) => [
                ...all
                    .filter((c) => c.position === p)
                    .sort(byPointsDesc)
                    .slice(0, TOP_PER_POSITION),
                ...cheapestByPosition[p].slice(0, CHEAPEST_PER_POSITION),
            ]),
        ]),
    ]
    const cheapestOrder = POSITIONS.flatMap((p) => cheapestByPosition[p])
    const starts = [
        construct(locked, cheapestOrder, rules, cheapestByPosition),
        construct(locked, [...pool].sort(byPointsDesc), rules, cheapestByPosition),
        construct(
            locked,
            [...pool].sort(
                (a, b) =>
                    b.points / Math.max(b.priceTenths, 1) - a.points / Math.max(a.priceTenths, 1) ||
                    a.id.localeCompare(b.id),
            ),
            rules,
            cheapestByPosition,
        ),
    ].filter((s): s is Candidate[] => s !== null)

    if (starts.length === 0) {
        const fallback = findAnyFeasible(locked, cheapestByPosition, rules)

        if (!fallback || !feasible(fallback, rules))
            throw new InfeasibleError('No squad fits the budget and the club limit')

        starts.push(fallback)
    }

    let best: Candidate[] | null = null
    let bestValue = -Infinity

    for (const start of starts) {
        const squad = climb(start, pool, rules, lockedIds)
        const value = bestSquadValue(squad, rules)

        if (value > bestValue + 1e-12) {
            best = squad
            bestValue = value
        }
    }

    // Iterated local search: drop a few players, refill with a noisy greedy order, climb again, keep the best.
    let seed = 12345

    const random = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296

        return seed / 4294967296
    }

    const restarts = pool.length > SMALL_POOL ? RESTARTS_LARGE : RESTARTS_SMALL

    for (let round = 0; round < restarts; round += 1) {
        const removable = (best as Candidate[]).filter((c) => !lockedIds.has(c.id))
        const drop = new Set<string>()
        const count = 2 + (round % 3)

        while (drop.size < Math.min(count, removable.length))
            drop.add(removable[Math.floor(random() * removable.length)].id)

        const kept = (best as Candidate[]).filter((c) => !drop.has(c.id))
        const noisy = [...pool]
            .map((c) => ({ c, key: (c.points + 0.5) * (0.6 + 0.8 * random()) }))
            .sort((a, b) => b.key - a.key || a.c.id.localeCompare(b.c.id))
            .map((x) => x.c)
        const rebuilt = construct(kept, noisy, rules, cheapestByPosition)

        if (!rebuilt) continue

        const squad = climb(rebuilt, pool, rules, lockedIds)
        const value = bestSquadValue(squad, rules)

        if (value > bestValue + 1e-12) {
            best = squad
            bestValue = value
        }
    }

    const squad = best as Candidate[]
    const xi = bestXi(squad, rules) as { starters: Candidate[]; value: number }
    const starterIds = new Set(xi.starters.map((c) => c.id))
    const rest = squad.filter((c) => !starterIds.has(c.id)).sort(byPointsDesc)
    const bench = [...rest.filter((c) => c.position === 'GK'), ...rest.filter((c) => c.position !== 'GK')]
    const ranked = [...xi.starters].sort(byPointsDesc)

    return {
        starters: xi.starters.map((c) => c.id),
        bench: bench.map((c) => c.id),
        captainId: ranked[0].id,
        viceCaptainId: ranked[1].id,
        totalTenths: cost(squad),
        expectedXi: xi.value + ranked[0].points,
        objective: bestValue,
    }
}

import {
    BUDGET_TOTAL,
    MAX_PER_CLUB,
    MAX_SQUAD_SIZE,
} from '@/entities/players/model/player-selection.validation'
import type { PlayerPosition } from '@/entities/players/model/player.types'

/** A fictional manager and the club name their fantasy team plays under. */
export interface DemoManagerProfile {
    /** Stable key — drives the synthetic email and the PRNG seed. */
    slug: string
    managerName: string
    teamName: string
}

/**
 * Fixed roster of demo competitors. Order is stable, so seeding N competitors
 * always produces the same first N managers and re-running never renames anyone.
 */
export const DEMO_MANAGERS: DemoManagerProfile[] = [
    { slug: 'alex-united', managerName: 'Alex Berzins', teamName: 'Alex United' },
    { slug: 'baltic-xi', managerName: 'Katrina Ozola', teamName: 'Baltic XI' },
    { slug: 'dynamo-fantasy', managerName: 'Marek Novak', teamName: 'Dynamo Fantasy' },
    { slug: 'weekend-warriors', managerName: 'Sofia Almeida', teamName: 'Weekend Warriors' },
    { slug: 'riga-all-stars', managerName: 'Janis Kalnins', teamName: 'Riga All-Stars' },
    { slug: 'riga-united', managerName: 'Elina Ozolina', teamName: 'Riga United' },
    { slug: 'northern-stars', managerName: 'Henrik Dahl', teamName: 'Northern Stars' },
    { slug: 'goal-hunters', managerName: 'Mateo Vidal', teamName: 'Goal Hunters' },
    { slug: 'fantasy-crew', managerName: 'Yuki Tanaka', teamName: 'Fantasy Crew' },
    { slug: 'red-lions', managerName: 'Omar Haddad', teamName: 'Red Lions' },
    { slug: 'northside-rovers', managerName: 'Declan Moore', teamName: 'Northside Rovers' },
    { slug: 'costa-galacticos', managerName: 'Lucia Ferrer', teamName: 'Costa Galacticos' },
    { slug: 'harbour-city-fc', managerName: 'Tomas Weber', teamName: 'Harbour City FC' },
    { slug: 'midfield-generals', managerName: 'Amara Diallo', teamName: 'Midfield Generals' },
    { slug: 'sunday-league-legends', managerName: 'Priya Raman', teamName: 'Sunday League Legends' },
    { slug: 'tiki-taka-tacticians', managerName: 'Gabriel Rossi', teamName: 'Tiki Taka Tacticians' },
    { slug: 'the-underdogs', managerName: 'Nora Lindqvist', teamName: 'The Underdogs' },
    { slug: 'counter-attack-kings', managerName: 'Viktor Petrov', teamName: 'Counter Attack Kings' },
    { slug: 'seaside-strikers', managerName: 'Ines Costa', teamName: 'Seaside Strikers' },
    { slug: 'old-town-athletic', managerName: 'Bruno Keller', teamName: 'Old Town Athletic' },
    { slug: 'golden-boot-society', managerName: 'Fatima Zahra', teamName: 'Golden Boot Society' },
    { slug: 'clean-sheet-club', managerName: 'Lars Nielsen', teamName: 'Clean Sheet Club' },
    { slug: 'hat-trick-heroes', managerName: 'Diego Fuentes', teamName: 'Hat-Trick Heroes' },
    { slug: 'offside-trap-fc', managerName: 'Hana Suzuki', teamName: 'Offside Trap FC' },
]

/** Domain reserved for demo accounts. Not a routable TLD — nothing can be mailed to it. */
export const DEMO_EMAIL_DOMAIN = 'demo.invalid'

export const demoEmail = (slug: string): string => `demo-${slug}@${DEMO_EMAIL_DOMAIN}`

export const isDemoEmail = (email: string): boolean => email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)

export function pickDemoManagers(count: number): DemoManagerProfile[] {
    if (count <= 0) return []

    return DEMO_MANAGERS.slice(0, Math.min(count, DEMO_MANAGERS.length))
}

/**
 * FNV-1a with a murmur-style finalizer — the seed source for all demo
 * determinism. The finalizer matters: plain FNV-1a barely changes when only
 * the last character differs (e.g. `gw-1` vs `gw-2`), which collapsed score
 * variety across gameweeks.
 */
export function hashSeed(input: string): number {
    let hash = 2166136261

    for (const char of input) {
        hash ^= char.charCodeAt(0)
        hash = Math.imul(hash, 16777619)
    }

    hash ^= hash >>> 16
    hash = Math.imul(hash, 2246822507)
    hash ^= hash >>> 13
    hash = Math.imul(hash, 3266489909)
    hash ^= hash >>> 16

    return hash >>> 0
}

/**
 * The demo roster for one competition: a seeded shuffle of the full roster,
 * so different competitions field different (but stable) line-ups. Growing
 * `count` later extends the same ordering — earlier picks never change.
 */
export function pickDemoManagersForCompetition(competitionId: string, count: number): DemoManagerProfile[] {
    if (count <= 0) return []

    const random = mulberry32(hashSeed(`roster:${competitionId}`))

    return shuffle(DEMO_MANAGERS, random).slice(0, Math.min(count, DEMO_MANAGERS.length))
}

export interface DemoPoolPlayer {
    /** Internal Player.id */
    id: string
    externalId: number
    name: string
    position: PlayerPosition
    teamExternalId: number
    price: number
}

/** 1-4-4-2 — a legal shape under POSITION_LIMITS and the most forgiving on budget. */
const DEMO_FORMATION: Record<PlayerPosition, number> = { GK: 1, DEF: 4, MID: 4, FWD: 2 }

const MAX_SWAPS = 200

/** Deterministic PRNG — same seed, same squad, every run. */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0

    return () => {
        a = (a + 0x6d2b79f5) >>> 0

        let t = Math.imul(a ^ (a >>> 15), 1 | a)

        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function shuffle<T>(items: T[], random: () => number): T[] {
    const copy = [...items]

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))

        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }

    return copy
}

const total = (players: DemoPoolPlayer[]) => players.reduce((sum, p) => sum + p.price, 0)

const clubCounts = (players: DemoPoolPlayer[]) => {
    const counts = new Map<number, number>()

    for (const player of players) {
        counts.set(player.teamExternalId, (counts.get(player.teamExternalId) ?? 0) + 1)
    }

    return counts
}

/**
 * Builds a deterministic, rules-valid demo squad: 11 players in a 4-4-2, at most
 * `MAX_PER_CLUB` from one club, inside `BUDGET_TOTAL`.
 *
 * Returns null when the pool is too thin to satisfy the shape or the budget —
 * the caller should skip that competitor rather than seed a broken team.
 */
export function buildDemoSquad(pool: DemoPoolPlayer[], seed: number): DemoPoolPlayer[] | null {
    const random = mulberry32(seed)
    const byPosition = new Map<PlayerPosition, DemoPoolPlayer[]>()

    for (const player of pool) {
        const list = byPosition.get(player.position) ?? []

        list.push(player)
        byPosition.set(player.position, list)
    }

    const picked: DemoPoolPlayer[] = []
    const pickedIds = new Set<string>()

    for (const [position, needed] of Object.entries(DEMO_FORMATION) as [PlayerPosition, number][]) {
        const candidates = shuffle(byPosition.get(position) ?? [], random)
        let filled = 0

        for (const candidate of candidates) {
            if (filled === needed) break

            if (pickedIds.has(candidate.id)) continue

            const counts = clubCounts(picked)

            if ((counts.get(candidate.teamExternalId) ?? 0) >= MAX_PER_CLUB) continue

            picked.push(candidate)
            pickedIds.add(candidate.id)
            filled++
        }

        if (filled < needed) return null
    }

    if (picked.length !== MAX_SQUAD_SIZE) return null

    // Trade the priciest picks down until the squad fits the budget.
    let swaps = 0

    while (total(picked) > BUDGET_TOTAL && swaps < MAX_SWAPS) {
        const priciestIndex = picked.reduce(
            (best, player, index) => (player.price > picked[best].price ? index : best),
            0,
        )
        const outgoing = picked[priciestIndex]
        const others = picked.filter((_, index) => index !== priciestIndex)
        const counts = clubCounts(others)

        const replacement = (byPosition.get(outgoing.position) ?? [])
            .filter(
                (candidate) =>
                    !pickedIds.has(candidate.id) &&
                    candidate.price < outgoing.price &&
                    (counts.get(candidate.teamExternalId) ?? 0) < MAX_PER_CLUB,
            )
            .sort((a, b) => a.price - b.price)[0]

        if (!replacement) return null

        pickedIds.delete(outgoing.id)
        pickedIds.add(replacement.id)
        picked[priciestIndex] = replacement
        swaps++
    }

    if (total(picked) > BUDGET_TOTAL) return null

    return picked
}

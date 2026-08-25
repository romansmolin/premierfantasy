import { describe, expect, it } from 'vitest'

import {
    BUDGET_TOTAL,
    MAX_PER_CLUB,
    MAX_SQUAD_SIZE,
    POSITION_LIMITS,
} from '@/entities/players/model/player-selection.validation'
import type { PlayerPosition } from '@/entities/players/model/player.types'

import {
    buildDemoSquad,
    DEMO_MANAGERS,
    demoEmail,
    isDemoEmail,
    pickDemoManagers,
    pickDemoManagersForCompetition,
} from './demo-roster'

import type { DemoPoolPlayer } from './demo-roster'

/** A pool wide enough to satisfy the formation and the per-club cap. */
const buildPool = (perPosition = 20, clubs = 10, price = 5): DemoPoolPlayer[] => {
    const positions: PlayerPosition[] = ['GK', 'DEF', 'MID', 'FWD']

    return positions.flatMap((position) =>
        Array.from({ length: perPosition }, (_, i) => ({
            id: `${position}-${i}`,
            externalId: 1000 + positions.indexOf(position) * 100 + i,
            name: `${position} ${i}`,
            position,
            teamExternalId: i % clubs,
            price,
        })),
    )
}

const totalPrice = (players: DemoPoolPlayer[]) => players.reduce((sum, p) => sum + p.price, 0)

const countPositions = (players: DemoPoolPlayer[]) =>
    players.reduce<Record<string, number>>((acc, p) => {
        acc[p.position] = (acc[p.position] ?? 0) + 1

        return acc
    }, {})

describe('demo manager identities', () => {
    it('reserves a non-routable email domain', () => {
        expect(demoEmail('alex-united')).toBe('demo-alex-united@demo.invalid')
        expect(isDemoEmail(demoEmail('alex-united'))).toBe(true)
        expect(isDemoEmail('real.person@example.com')).toBe(false)
    })

    it('returns a stable prefix of the roster so re-seeding keeps the same managers', () => {
        expect(pickDemoManagers(3).map((m) => m.slug)).toEqual(
            pickDemoManagers(5)
                .slice(0, 3)
                .map((m) => m.slug),
        )
    })

    it('caps at the number of profiles that exist and handles zero', () => {
        expect(pickDemoManagers(0)).toEqual([])
        expect(pickDemoManagers(500).length).toBeLessThanOrEqual(DEMO_MANAGERS.length)
    })
})

describe('pickDemoManagersForCompetition', () => {
    it('is deterministic per competition', () => {
        expect(pickDemoManagersForCompetition('comp-1', 8)).toEqual(
            pickDemoManagersForCompetition('comp-1', 8),
        )
    })

    it('fields different line-ups for different competitions', () => {
        const a = pickDemoManagersForCompetition('comp-1', 8).map((m) => m.slug)
        const b = pickDemoManagersForCompetition('comp-2', 8).map((m) => m.slug)

        expect(a).not.toEqual(b)
    })

    it('extends the same ordering when more managers are requested later', () => {
        const five = pickDemoManagersForCompetition('comp-1', 5).map((m) => m.slug)
        const nine = pickDemoManagersForCompetition('comp-1', 9).map((m) => m.slug)

        expect(nine.slice(0, 5)).toEqual(five)
    })

    it('never repeats a manager within one competition', () => {
        const slugs = pickDemoManagersForCompetition('comp-1', DEMO_MANAGERS.length).map((m) => m.slug)

        expect(new Set(slugs).size).toBe(DEMO_MANAGERS.length)
    })
})

describe('buildDemoSquad', () => {
    it('builds a squad that satisfies size, formation, budget and club limits', () => {
        const squad = buildDemoSquad(buildPool(), 12345)

        expect(squad).not.toBeNull()
        expect(squad!).toHaveLength(MAX_SQUAD_SIZE)
        expect(totalPrice(squad!)).toBeLessThanOrEqual(BUDGET_TOTAL)

        const counts = countPositions(squad!)

        for (const [position, limit] of Object.entries(POSITION_LIMITS)) {
            expect(counts[position] ?? 0).toBeGreaterThanOrEqual(limit.min)
            expect(counts[position] ?? 0).toBeLessThanOrEqual(limit.max)
        }

        const perClub = squad!.reduce<Record<number, number>>((acc, p) => {
            acc[p.teamExternalId] = (acc[p.teamExternalId] ?? 0) + 1

            return acc
        }, {})

        expect(Math.max(...Object.values(perClub))).toBeLessThanOrEqual(MAX_PER_CLUB)
    })

    it('never repeats a player', () => {
        const squad = buildDemoSquad(buildPool(), 999)

        expect(new Set(squad!.map((p) => p.id)).size).toBe(MAX_SQUAD_SIZE)
    })

    it('is deterministic — the same seed rebuilds the same squad', () => {
        const first = buildDemoSquad(buildPool(), 42)
        const second = buildDemoSquad(buildPool(), 42)

        expect(first!.map((p) => p.id)).toEqual(second!.map((p) => p.id))
    })

    it('produces different squads for different seeds', () => {
        const first = buildDemoSquad(buildPool(), 1)
        const second = buildDemoSquad(buildPool(), 2)

        expect(first!.map((p) => p.id)).not.toEqual(second!.map((p) => p.id))
    })

    it('trades expensive picks down to fit the budget', () => {
        const pool = buildPool(20, 10, 5).map((player, index) => ({
            ...player,
            // Half the pool is unaffordable; the builder has to swap down into the cheap half.
            price: index % 2 === 0 ? 25 : 3,
        }))

        const squad = buildDemoSquad(pool, 7)

        expect(squad).not.toBeNull()
        expect(totalPrice(squad!)).toBeLessThanOrEqual(BUDGET_TOTAL)
    })

    it('returns null when the pool cannot fill the formation', () => {
        const pool = buildPool().filter((p) => p.position !== 'GK')

        expect(buildDemoSquad(pool, 1)).toBeNull()
    })

    it('returns null when every player is unaffordable', () => {
        const pool = buildPool(20, 10, 50)

        expect(buildDemoSquad(pool, 1)).toBeNull()
    })

    it('returns null for an empty pool', () => {
        expect(buildDemoSquad([], 1)).toBeNull()
    })
})

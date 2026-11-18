import { describe, expect, it } from 'vitest'

import type { ScoutListItem } from '@/entities/scout'

import { queryPlayers } from './players-query'

import type { ScoutFilters } from './players-query'

const item = (id: string, over: Partial<ScoutListItem> = {}): ScoutListItem => ({
    id,
    externalId: 1,
    name: id,
    club: { id: 'c1', name: 'Arsenal', logo: null },
    position: 'MID',
    price: 7,
    minutes: 900,
    goals: 1,
    assists: 1,
    form: 5,
    forecast: null,
    availability: null,
    next: null,
    pointsPerMillion: 0.5,
    ...over,
})

const base: ScoutFilters = { q: '', position: '', clubId: '', maxPrice: null, sort: 'name' }

const ids = (list: ScoutListItem[]) => list.map((i) => i.id)

describe('queryPlayers', () => {
    it('searches names ignoring case and accents', () => {
        const list = [item('Gabriel Magalhães'), item('Saka')]

        expect(ids(queryPlayers(list, { ...base, q: 'magalhaes' }))).toEqual(['Gabriel Magalhães'])
        expect(ids(queryPlayers(list, { ...base, q: 'SAK' }))).toEqual(['Saka'])
    })

    it('filters by position and club', () => {
        const list = [
            item('a', { position: 'FWD' }),
            item('b', { club: { id: 'c2', name: 'Chelsea', logo: null } }),
            item('c'),
        ]

        expect(ids(queryPlayers(list, { ...base, position: 'FWD' }))).toEqual(['a'])
        expect(ids(queryPlayers(list, { ...base, clubId: 'c2' }))).toEqual(['b'])
    })

    it('drops players without a fresh price when a price cap is set', () => {
        const list = [item('cheap', { price: 5 }), item('dear', { price: 9 }), item('none', { price: null })]

        expect(ids(queryPlayers(list, { ...base, maxPrice: 6 }))).toEqual(['cheap'])
        expect(ids(queryPlayers(list, base))).toHaveLength(3)
    })

    it('sorts numbers high to low and puts missing values last', () => {
        const list = [
            item('low', { pointsPerMillion: 0.2 }),
            item('none', { pointsPerMillion: null }),
            item('high', { pointsPerMillion: 1.4 }),
        ]

        expect(ids(queryPlayers(list, { ...base, sort: 'value' }))).toEqual(['high', 'low', 'none'])
    })

    it('sorts by the chance of a goal from the next match', () => {
        const next = (pGoal: number | null) => ({ pGoal, pAssist: null, pStart: null })
        const list = [
            item('a', { next: next(0.1) }),
            item('b', { next: null }),
            item('c', { next: next(0.4) }),
        ]

        expect(ids(queryPlayers(list, { ...base, sort: 'pGoal' }))).toEqual(['c', 'a', 'b'])
    })
})

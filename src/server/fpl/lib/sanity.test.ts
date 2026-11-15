import { describe, expect, it } from 'vitest'

import { SuspiciousResponseError } from '@/server/sync/lib/errors'

import sample from './__fixtures__/bootstrap.sample.json'
import { assertSaneBootstrap } from './sanity'

import type { FplBootstrap } from './fpl.types'

/** The sample has 12 real players; repeat them with new ids to reach a realistic list. */
const validBootstrap = (): FplBootstrap => {
    const base = sample as unknown as FplBootstrap
    const elements = Array.from({ length: 450 }, (_, i) => ({
        ...base.elements[i % base.elements.length],
        id: i + 1,
    }))

    return { ...base, elements }
}

describe('assertSaneBootstrap', () => {
    it('accepts a valid payload', () => {
        expect(() => assertSaneBootstrap(validBootstrap())).not.toThrow()
    })

    it('rejects fewer than 400 elements', () => {
        const data = { ...validBootstrap(), elements: validBootstrap().elements.slice(0, 399) }

        expect(() => assertSaneBootstrap(data)).toThrow(SuspiciousResponseError)
    })

    it('rejects a team count other than 20', () => {
        const data = { ...validBootstrap(), teams: validBootstrap().teams.slice(0, 19) }

        expect(() => assertSaneBootstrap(data)).toThrow(SuspiciousResponseError)
    })

    it('rejects fewer than 30 events', () => {
        const data = { ...validBootstrap(), events: validBootstrap().events.slice(0, 29) }

        expect(() => assertSaneBootstrap(data)).toThrow(SuspiciousResponseError)
    })

    it('rejects a missing game_settings', () => {
        const data = { ...validBootstrap(), game_settings: undefined } as unknown as FplBootstrap

        expect(() => assertSaneBootstrap(data)).toThrow(SuspiciousResponseError)
    })

    it('rejects game_settings with a non-numeric squad size', () => {
        const data = validBootstrap()

        data.game_settings = { ...data.game_settings, squad_squadsize: 'x' as unknown as number }

        expect(() => assertSaneBootstrap(data)).toThrow(SuspiciousResponseError)
    })

    it('rejects when the four position rules are missing', () => {
        const data = { ...validBootstrap(), element_types: validBootstrap().element_types.slice(0, 3) }

        expect(() => assertSaneBootstrap(data)).toThrow(SuspiciousResponseError)
    })
})

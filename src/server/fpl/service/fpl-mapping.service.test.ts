import { describe, expect, it, vi } from 'vitest'

import sample from '../lib/__fixtures__/bootstrap.sample.json'

import { FplMappingService } from './fpl-mapping.service'

import type { IFplClient } from '../lib/fpl-client'
import type { FplBootstrap, FplElement } from '../lib/fpl.types'
import type { OurPlayer } from '../lib/player-matcher'
import type { IFplMappingRepository } from '../repository/fpl-mapping.repository.interface'

const base = sample as unknown as FplBootstrap
const el = (
    id: number,
    first: string,
    second: string,
    team: number,
    type: number,
    minutes: number,
): FplElement => ({
    id,
    code: id,
    web_name: second,
    first_name: first,
    second_name: second,
    team,
    element_type: type,
    now_cost: 55,
    status: 'a',
    chance_of_playing_next_round: null,
    news: '',
    minutes,
})

interface State {
    elements?: FplElement[]
    mappings?: { fplId: number; playerId: string }[]
    rejected?: number[]
    players?: OurPlayer[]
    existingPlayerIds?: string[]
}

const make = (state: State = {}) => {
    const mappings = [...(state.mappings ?? [])]
    const rejected = new Set(state.rejected ?? [])
    const repo = {
        findMappings: vi.fn().mockImplementation(async () => mappings),
        findRejectedFplIds: vi.fn().mockImplementation(async () => new Set(rejected)),
        findLeaguePlayers: vi.fn().mockResolvedValue(state.players ?? []),
        findFplTeamMap: vi.fn().mockResolvedValue(new Map(base.teams.map((t) => [t.id, `t-${t.id}`]))),
        playerExists: vi
            .fn()
            .mockImplementation(async (id: string) => (state.existingPlayerIds ?? ['p1', 'p2']).includes(id)),
        createManualMapping: vi.fn().mockImplementation(async (fplId: number, playerId: string) => {
            mappings.push({ fplId, playerId })
        }),
        createRejection: vi.fn().mockImplementation(async (fplId: number) => {
            rejected.add(fplId)
        }),
        deleteRejection: vi.fn().mockImplementation(async (fplId: number) => {
            rejected.delete(fplId)
        }),
    } as unknown as IFplMappingRepository
    const client = {
        getBootstrap: vi.fn().mockResolvedValue({ ...base, elements: state.elements ?? [] }),
    } as unknown as IFplClient

    return { service: new FplMappingService(repo, client), repo }
}

describe('FplMappingService.listUnmapped', () => {
    it('lists only players with at least 90 minutes', async () => {
        const { service } = make({
            elements: [el(1, 'Regular', 'Starter', 1, 3, 900), el(2, 'Barely', 'Played', 1, 3, 45)],
        })

        const result = await service.listUnmapped(2026)

        expect(result.unmapped.map((u) => u.fplId)).toEqual([1])
    })

    it('does not list mapped players and counts them', async () => {
        const { service } = make({
            elements: [el(1, 'A', 'One', 1, 3, 900), el(2, 'B', 'Two', 1, 3, 900)],
            mappings: [{ fplId: 1, playerId: 'p1' }],
        })

        const result = await service.listUnmapped(2026)

        expect(result.unmapped.map((u) => u.fplId)).toEqual([2])
        expect(result.counts).toMatchObject({ mapped: 1, rejected: 0 })
    })

    it('rejecting an fplId removes it from the unmapped list', async () => {
        const { service } = make({ elements: [el(1, 'A', 'One', 1, 3, 900)], rejected: [1] })

        const result = await service.listUnmapped(2026)

        expect(result.unmapped).toEqual([])
        expect(result.counts.rejected).toBe(1)
    })

    it('offers our unmapped players of the same club and position as candidates', async () => {
        const players: OurPlayer[] = [
            { id: 'c1', name: 'Someone', position: 'MID', teamId: 't-1' },
            { id: 'c2', name: 'Other Club', position: 'MID', teamId: 't-2' },
            { id: 'c3', name: 'Wrong Position', position: 'DEF', teamId: 't-1' },
            { id: 'p1', name: 'Already Mapped', position: 'MID', teamId: 't-1' },
        ]
        const { service } = make({
            elements: [el(5, 'X', 'Y', 1, 3, 900)],
            players,
            mappings: [{ fplId: 99, playerId: 'p1' }],
        })

        const result = await service.listUnmapped(2026)

        expect(result.unmapped[0].candidates.map((c) => c.playerId)).toEqual(['c1'])
    })
})

describe('FplMappingService.confirm and reject', () => {
    it('creates a MANUAL mapping', async () => {
        const { service, repo } = make()

        await service.confirm(7, 'p1')

        expect(repo.createManualMapping).toHaveBeenCalledWith(7, 'p1')
    })

    it('is idempotent for an identical repeat', async () => {
        const { service, repo } = make({ mappings: [{ fplId: 7, playerId: 'p1' }] })

        await service.confirm(7, 'p1')

        expect(repo.createManualMapping).not.toHaveBeenCalled()
    })

    it('refuses a player that is already mapped with 409', async () => {
        const { service } = make({ mappings: [{ fplId: 3, playerId: 'p1' }] })

        await expect(service.confirm(7, 'p1')).rejects.toMatchObject({ statusCode: 409 })
    })

    it('refuses an fplId that is already mapped to another player with 409', async () => {
        const { service } = make({ mappings: [{ fplId: 7, playerId: 'p2' }] })

        await expect(service.confirm(7, 'p1')).rejects.toMatchObject({ statusCode: 409 })
    })

    it('returns 404 for an unknown player', async () => {
        const { service } = make()

        await expect(service.confirm(7, 'nope')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('confirming a rejected fplId lifts the rejection', async () => {
        const { service, repo } = make({ rejected: [7] })

        await service.confirm(7, 'p1')

        expect(repo.deleteRejection).toHaveBeenCalledWith(7)
        expect(repo.createManualMapping).toHaveBeenCalledWith(7, 'p1')
    })

    it('rejects an fplId and repeating it is a no-op', async () => {
        const { service, repo } = make()

        await service.reject(7)
        await service.reject(7)

        expect(repo.createRejection).toHaveBeenCalledTimes(1)
    })

    it('refuses to reject an fplId that is already mapped with 409', async () => {
        const { service } = make({ mappings: [{ fplId: 7, playerId: 'p1' }] })

        await expect(service.reject(7)).rejects.toMatchObject({ statusCode: 409 })
    })
})

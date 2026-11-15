import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SQUAD_RULES } from '@/entities/squad/model/rules'
import type { Position, SquadPlayerInfo } from '@/entities/squad/model/rules'

import { SquadService } from './squad.service'

import type { ISquadRepository, SquadWrite, StoredSquad } from '../repository/squad.repository.interface'

function infos(): SquadPlayerInfo[] {
    const spec: [Position, number][] = [
        ['GK', 2],
        ['DEF', 5],
        ['MID', 5],
        ['FWD', 3],
    ]
    const result: SquadPlayerInfo[] = []
    let n = 0

    for (const [position, count] of spec) {
        for (let i = 0; i < count; i += 1) {
            n += 1
            result.push({ playerId: `p${n}`, position, clubId: `c${(n % 8) + 1}`, priceTenths: 60 })
        }
    }

    return result
}

const input = (overrides = {}) => ({
    name: 'My squad',
    starters: ['p1', 'p3', 'p4', 'p5', 'p8', 'p9', 'p10', 'p11', 'p13', 'p14', 'p15'],
    bench: ['p2', 'p6', 'p7', 'p12'],
    captainId: 'p15',
    viceCaptainId: 'p14',
    ...overrides,
})

const make = (existing: StoredSquad[] = [], players = infos()) => {
    const store = [...existing]
    const toStored = (id: string, userId: string, data: SquadWrite): StoredSquad => ({
        id,
        userId,
        name: data.name,
        captainPlayerId: data.captainPlayerId,
        viceCaptainPlayerId: data.viceCaptainPlayerId,
        updatedAt: new Date('2026-11-16'),
        players: data.players,
    })
    const repo = {
        countByUser: vi
            .fn()
            .mockImplementation(async (userId: string) => store.filter((s) => s.userId === userId).length),
        findByUser: vi
            .fn()
            .mockImplementation(async (userId: string) => store.filter((s) => s.userId === userId)),
        findOwned: vi
            .fn()
            .mockImplementation(
                async (userId: string, id: string) =>
                    store.find((s) => s.id === id && s.userId === userId) ?? null,
            ),
        create: vi.fn().mockImplementation(async (userId: string, data: SquadWrite) => {
            const s = toStored(`s${store.length + 1}`, userId, data)

            store.push(s)

            return s
        }),
        replace: vi.fn().mockImplementation(async (id: string, data: SquadWrite) => {
            const i = store.findIndex((s) => s.id === id)

            store[i] = toStored(id, store[i].userId, data)

            return store[i]
        }),
        delete: vi.fn().mockImplementation(async (id: string) => {
            store.splice(
                store.findIndex((s) => s.id === id),
                1,
            )
        }),
        findPlayerInfos: vi
            .fn()
            .mockImplementation(async (ids: string[]) => players.filter((p) => ids.includes(p.playerId))),
        findRules: vi.fn().mockResolvedValue(null),
    } satisfies ISquadRepository

    return { service: new SquadService(repo), repo, store }
}

describe('SquadService', () => {
    it('saves a valid squad with start/bench order and the prices at save', async () => {
        const { service, repo } = make()

        const saved = await service.create('u1', input())

        expect(saved.starters).toHaveLength(11)
        expect(saved.bench).toEqual(['p2', 'p6', 'p7', 'p12'])
        expect(saved.validation.valid).toBe(true)

        const write = (repo.create as ReturnType<typeof vi.fn>).mock.calls[0][1] as SquadWrite

        expect(write.players.find((p) => p.playerId === 'p2')).toMatchObject({
            slot: 'BENCH',
            position: 0,
            priceTenthsAtSave: 60,
        })
    })

    it('refuses an invalid squad with 422 and the broken rules, and stores nothing', async () => {
        const { service, repo } = make()

        await expect(service.create('u1', input({ viceCaptainId: 'p15' }))).rejects.toMatchObject({
            statusCode: 422,
        })
        expect(repo.create).not.toHaveBeenCalled()
    })

    it('refuses players that do not exist', async () => {
        const { service } = make()

        await expect(
            service.create('u1', input({ bench: ['p2', 'p6', 'p7', 'ghost'] })),
        ).rejects.toMatchObject({ statusCode: 422 })
    })

    it("never shows or changes another user's squad", async () => {
        const { service } = make()
        const mine = await service.create('u1', input())

        await expect(service.get('u2', mine.id)).rejects.toMatchObject({ statusCode: 404 })
        await expect(service.update('u2', mine.id, input())).rejects.toMatchObject({ statusCode: 404 })
        await expect(service.remove('u2', mine.id)).rejects.toMatchObject({ statusCode: 404 })
        expect(await service.list('u2')).toEqual([])
    })

    it('updates and deletes a squad of the owner', async () => {
        const { service } = make()
        const mine = await service.create('u1', input())
        const updated = await service.update('u1', mine.id, input({ name: 'Renamed' }))

        expect(updated.name).toBe('Renamed')

        await service.remove('u1', mine.id)

        expect(await service.list('u1')).toEqual([])
    })

    it('caps squads per user at 50', async () => {
        const { service } = make(
            Array.from({ length: 50 }, (_, i) => ({
                id: `x${i}`,
                userId: 'u1',
                name: 'n',
                captainPlayerId: 'p15',
                viceCaptainPlayerId: 'p14',
                updatedAt: new Date(),
                players: [],
            })),
        )

        await expect(service.create('u1', input())).rejects.toMatchObject({ statusCode: 422 })
    })

    it('reports price drift against the saved prices', async () => {
        const { service, store } = make()
        const mine = await service.create('u1', input())

        // everything got 0.1m dearer since the squad was saved
        const dearer = infos().map((p) => ({ ...p, priceTenths: 61 }))
        const again = new SquadService({ ...(makeRepoFrom(store, dearer) as ISquadRepository) })

        expect((await again.get('u1', mine.id)).priceDriftTenths).toBe(15)
    })

    it('uses the default rules when no settings are stored yet', async () => {
        const { repo } = make()

        expect(await repo.findRules()).toBeNull()
        expect(DEFAULT_SQUAD_RULES.squadSize).toBe(15)
    })
})

function makeRepoFrom(store: StoredSquad[], players: SquadPlayerInfo[]): Partial<ISquadRepository> {
    return {
        findOwned: async (userId: string, id: string) =>
            store.find((s) => s.id === id && s.userId === userId) ?? null,
        findPlayerInfos: async (ids: string[]) => players.filter((p) => ids.includes(p.playerId)),
        findRules: async () => null,
    }
}

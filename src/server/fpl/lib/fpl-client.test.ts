import { describe, expect, it, vi } from 'vitest'

import sample from './__fixtures__/bootstrap.sample.json'
import { createFplClient, FplNotFoundError } from './fpl-client'

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

const noSleep = async () => {}

describe('createFplClient', () => {
    it('returns typed bootstrap data', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(ok(sample))
        const data = await createFplClient({ fetchImpl, sleep: noSleep }).getBootstrap()

        expect(data.teams).toHaveLength(20)
        expect(String(fetchImpl.mock.calls[0][0])).toBe(
            'https://fantasy.premierleague.com/api/bootstrap-static/',
        )
        expect((fetchImpl.mock.calls[0][1] as RequestInit).headers).toMatchObject({
            'User-Agent': expect.stringMatching(/^Mozilla/),
        })
    })

    it('retries a 500 once and then succeeds', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(new Response('x', { status: 500 }))
            .mockResolvedValueOnce(ok([]))

        await expect(createFplClient({ fetchImpl, sleep: noSleep }).getFixtures()).resolves.toEqual([])
        expect(fetchImpl).toHaveBeenCalledTimes(2)
    })

    it('retries a network error and throws after two retries', async () => {
        const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'))

        await expect(createFplClient({ fetchImpl, sleep: noSleep }).getFixtures()).rejects.toThrow(
            'network down',
        )
        expect(fetchImpl).toHaveBeenCalledTimes(3)
    })

    it('does not retry a 404 and reports it as FplNotFoundError', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(new Response('nope', { status: 404 }))

        await expect(createFplClient({ fetchImpl, sleep: noSleep }).getEventLive(50)).rejects.toBeInstanceOf(
            FplNotFoundError,
        )
        expect(fetchImpl).toHaveBeenCalledTimes(1)
        expect(String(fetchImpl.mock.calls[0][0])).toBe(
            'https://fantasy.premierleague.com/api/event/50/live/',
        )
    })
})

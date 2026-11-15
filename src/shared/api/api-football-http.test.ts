import { describe, expect, it, vi } from 'vitest'

import { ApiFootballError, ApiFootballHttp } from './api-football-http'

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
    new Response(JSON.stringify(body), { status: 200, ...init })

const make = (response: Response) => {
    const fetchImpl = vi.fn().mockResolvedValue(response)
    const http = new ApiFootballHttp({ baseUrl: 'https://api.test', apiKey: 'secret-key', fetchImpl })

    return { http, fetchImpl }
}

describe('ApiFootballHttp.get', () => {
    it('returns response data and the daily remaining quota from headers', async () => {
        const { http } = make(
            jsonResponse(
                { errors: [], response: [{ id: 1 }] },
                { headers: { 'x-ratelimit-requests-remaining': '7498' } },
            ),
        )

        await expect(http.get('/fixtures')).resolves.toEqual({ data: [{ id: 1 }], dailyRemaining: 7498 })
    })

    it('dailyRemaining is null when the header is absent', async () => {
        const { http } = make(jsonResponse({ errors: [], response: [] }))

        await expect(http.get('/fixtures')).resolves.toMatchObject({ dailyRemaining: null })
    })

    it('throws ApiFootballError when errors is a non-empty object', async () => {
        const { http } = make(jsonResponse({ errors: { requests: 'limit reached' }, response: [] }))

        await expect(http.get('/fixtures')).rejects.toBeInstanceOf(ApiFootballError)
    })

    it('throws ApiFootballError when errors is a non-empty array', async () => {
        const { http } = make(jsonResponse({ errors: ['x'], response: [] }))

        await expect(http.get('/fixtures')).rejects.toBeInstanceOf(ApiFootballError)
    })

    it('does not throw for empty errors, array or object', async () => {
        await expect(make(jsonResponse({ errors: [], response: [] })).http.get('/x')).resolves.toBeDefined()
        await expect(make(jsonResponse({ errors: {}, response: [] })).http.get('/x')).resolves.toBeDefined()
    })

    it('throws on a non-2xx status with the status in the message', async () => {
        const { http } = make(new Response('nope', { status: 503, statusText: 'Service Unavailable' }))

        await expect(http.get('/fixtures')).rejects.toThrow(/503/)
    })

    it('sends the x-apisports-key header and encodes params in the query string', async () => {
        const { http, fetchImpl } = make(jsonResponse({ errors: [], response: [] }))

        await http.get('/fixtures', { league: 39, season: 2026 })

        const [url, init] = fetchImpl.mock.calls[0]

        expect(String(url)).toBe('https://api.test/fixtures?league=39&season=2026')
        expect((init as RequestInit).headers).toMatchObject({ 'x-apisports-key': 'secret-key' })
    })

    it('spaces requests by minIntervalMs', async () => {
        const sleep = vi.fn().mockResolvedValue(undefined)
        const fetchImpl = vi.fn().mockImplementation(async () => jsonResponse({ errors: [], response: [] }))
        const http = new ApiFootballHttp({
            baseUrl: 'https://api.test',
            apiKey: 'k',
            fetchImpl,
            minIntervalMs: 250,
            sleep,
            now: () => 1000,
        })

        await http.get('/a')
        await http.get('/b')

        expect(sleep).toHaveBeenCalledTimes(1)
        expect(sleep).toHaveBeenCalledWith(250)
    })

    it('retries a 429 after waiting and then succeeds', async () => {
        const sleep = vi.fn().mockResolvedValue(undefined)
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(
                new Response('slow down', { status: 429, statusText: 'Too Many Requests' }),
            )
            .mockResolvedValueOnce(jsonResponse({ errors: [], response: [1] }))
        const http = new ApiFootballHttp({ baseUrl: 'https://api.test', apiKey: 'k', fetchImpl, sleep })

        await expect(http.get('/a')).resolves.toMatchObject({ data: [1] })
        expect(fetchImpl).toHaveBeenCalledTimes(2)
        expect(sleep.mock.calls[0][0]).toBeGreaterThanOrEqual(10_000)
    })

    it('gives up after repeated 429 answers with an ApiFootballError', async () => {
        const sleep = vi.fn().mockResolvedValue(undefined)
        const fetchImpl = vi
            .fn()
            .mockResolvedValue(new Response('no', { status: 429, statusText: 'Too Many Requests' }))
        const http = new ApiFootballHttp({ baseUrl: 'https://api.test', apiKey: 'k', fetchImpl, sleep })

        await expect(http.get('/a')).rejects.toBeInstanceOf(ApiFootballError)
        await expect(http.get('/a')).rejects.toThrow(/429/)
        expect(fetchImpl).toHaveBeenCalledTimes(6)
    })

    it('never puts the api key into an error message', async () => {
        const { http } = make(jsonResponse({ errors: { token: 'bad key secret-key' }, response: [] }))

        await expect(http.get('/fixtures')).rejects.not.toThrow(/secret-key/)
    })
})

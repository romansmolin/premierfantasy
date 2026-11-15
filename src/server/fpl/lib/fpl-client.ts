import type { FplBootstrap, FplEventLive, FplFixture } from './fpl.types'

const BASE_URL = 'https://fantasy.premierleague.com/api'
const USER_AGENT = 'Mozilla/5.0 (compatible; premierfantasy-sync)'
const TIMEOUT_MS = 20_000
const MAX_ATTEMPTS = 3

export class FplNotFoundError extends Error {
    constructor(path: string) {
        super(`FPL ${path} not found`)
        this.name = 'FplNotFoundError'
    }
}

export interface IFplClient {
    getBootstrap(): Promise<FplBootstrap>
    getFixtures(): Promise<FplFixture[]>
    /** Throws FplNotFoundError for an event that does not exist (yet). */
    getEventLive(event: number): Promise<FplEventLive>
}

interface FplClientOptions {
    fetchImpl?: typeof fetch
    sleep?: (ms: number) => Promise<void>
}

export function createFplClient({
    fetchImpl = fetch,
    sleep = defaultSleep,
}: FplClientOptions = {}): IFplClient {
    async function get<T>(path: string): Promise<T> {
        let lastError: unknown

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
            try {
                const response = await fetchImpl(`${BASE_URL}${path}`, {
                    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
                    signal: AbortSignal.timeout(TIMEOUT_MS),
                })

                if (response.status === 404) throw new FplNotFoundError(path)

                if (!response.ok) throw new Error(`FPL request failed: ${response.status} ${path}`)

                return (await response.json()) as T
            } catch (error) {
                if (error instanceof FplNotFoundError) throw error

                lastError = error

                if (attempt < MAX_ATTEMPTS) await sleep(500 * attempt)
            }
        }

        throw lastError
    }

    return {
        getBootstrap: () => get<FplBootstrap>('/bootstrap-static/'),
        getFixtures: () => get<FplFixture[]>('/fixtures/'),
        getEventLive: (event) => get<FplEventLive>(`/event/${event}/live/`),
    }
}

function defaultSleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

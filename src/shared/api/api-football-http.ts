export class ApiFootballError extends Error {
    readonly details: unknown

    constructor(message: string, details?: unknown) {
        super(message)
        this.name = 'ApiFootballError'
        this.details = details
    }
}

export interface ApiFootballResult<T> {
    data: T
    /** Requests left today according to the `x-ratelimit-requests-remaining` header, or null when absent. */
    dailyRemaining: number | null
}

interface ApiFootballEnvelope<T> {
    errors?: unknown
    response: T
}

interface ApiFootballHttpOptions {
    baseUrl: string
    apiKey: string
    fetchImpl?: typeof fetch
    /** Minimum gap between two requests (the plan allows 300 per minute). 0 = no spacing. */
    minIntervalMs?: number
    sleep?: (ms: number) => Promise<void>
    now?: () => number
}

const MAX_RATE_LIMIT_ATTEMPTS = 3
const RATE_LIMIT_WAIT_MS = 15_000

const hasErrors = (errors: unknown): boolean => {
    if (Array.isArray(errors)) return errors.length > 0

    return typeof errors === 'object' && errors !== null && Object.keys(errors).length > 0
}

/** Plain HTTP client for API-Football. No `server-only`, so scripts and the website can both use it. */
export class ApiFootballHttp {
    private readonly baseUrl: string
    private readonly apiKey: string
    private readonly fetchImpl: typeof fetch
    private readonly minIntervalMs: number
    private readonly sleep: (ms: number) => Promise<void>
    private readonly now: () => number
    private lastRequestAt: number | null = null

    constructor({ baseUrl, apiKey, fetchImpl, minIntervalMs = 0, sleep, now }: ApiFootballHttpOptions) {
        this.baseUrl = baseUrl
        this.apiKey = apiKey
        this.fetchImpl = fetchImpl ?? fetch
        this.minIntervalMs = minIntervalMs
        this.sleep = sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
        this.now = now ?? Date.now
    }

    async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<ApiFootballResult<T>> {
        const url = new URL(`${this.baseUrl}${endpoint}`)

        for (const [key, value] of Object.entries(params ?? {})) {
            url.searchParams.set(key, String(value))
        }

        const response = await this.fetchWithRateLimit(url.toString())

        if (!response.ok) {
            throw new ApiFootballError(
                `API-Football request failed: ${response.status} ${response.statusText}`,
            )
        }

        const json = (await response.json()) as ApiFootballEnvelope<T>

        // API-Football reports quota and parameter problems with HTTP 200 and an `errors` payload.
        if (hasErrors(json.errors)) {
            throw new ApiFootballError(
                `API-Football returned errors: ${this.redact(JSON.stringify(json.errors))}`,
                json.errors,
            )
        }

        const remaining = Number(response.headers.get('x-ratelimit-requests-remaining'))

        return {
            data: json.response,
            dailyRemaining:
                response.headers.has('x-ratelimit-requests-remaining') && Number.isFinite(remaining)
                    ? remaining
                    : null,
        }
    }

    private async fetchWithRateLimit(url: string): Promise<Response> {
        for (let attempt = 1; ; attempt += 1) {
            await this.space()

            const response = await this.fetchImpl(url, { headers: { 'x-apisports-key': this.apiKey } })

            if (response.status !== 429 || attempt >= MAX_RATE_LIMIT_ATTEMPTS) return response

            await this.sleep(RATE_LIMIT_WAIT_MS * attempt)
        }
    }

    private async space(): Promise<void> {
        if (this.minIntervalMs > 0 && this.lastRequestAt !== null) {
            const wait = this.lastRequestAt + this.minIntervalMs - this.now()

            if (wait > 0) await this.sleep(wait)
        }

        this.lastRequestAt = this.now()
    }

    private redact(text: string): string {
        return text.split(this.apiKey).join('***')
    }
}

export function createApiFootballHttpFromEnv(options: { minIntervalMs?: number } = {}): ApiFootballHttp {
    const baseUrl = process.env.FOOTBAL_API_BASE_URL

    if (!baseUrl) throw new Error('FOOTBAL_API_BASE_URL is not defined')

    const apiKey = process.env.FOOTBAL_API_KEY

    if (!apiKey) throw new Error('FOOTBAL_API_KEY is not defined')

    return new ApiFootballHttp({ baseUrl, apiKey, ...options })
}

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
}

const hasErrors = (errors: unknown): boolean => {
    if (Array.isArray(errors)) return errors.length > 0

    return typeof errors === 'object' && errors !== null && Object.keys(errors).length > 0
}

/** Plain HTTP client for API-Football. No `server-only`, so scripts and the website can both use it. */
export class ApiFootballHttp {
    private readonly baseUrl: string
    private readonly apiKey: string
    private readonly fetchImpl: typeof fetch

    constructor({ baseUrl, apiKey, fetchImpl }: ApiFootballHttpOptions) {
        this.baseUrl = baseUrl
        this.apiKey = apiKey
        this.fetchImpl = fetchImpl ?? fetch
    }

    async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<ApiFootballResult<T>> {
        const url = new URL(`${this.baseUrl}${endpoint}`)

        for (const [key, value] of Object.entries(params ?? {})) {
            url.searchParams.set(key, String(value))
        }

        const response = await this.fetchImpl(url.toString(), { headers: { 'x-apisports-key': this.apiKey } })

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

    private redact(text: string): string {
        return text.split(this.apiKey).join('***')
    }
}

export function createApiFootballHttpFromEnv(): ApiFootballHttp {
    const baseUrl = process.env.FOOTBAL_API_BASE_URL

    if (!baseUrl) throw new Error('FOOTBAL_API_BASE_URL is not defined')

    const apiKey = process.env.FOOTBAL_API_KEY

    if (!apiKey) throw new Error('FOOTBAL_API_KEY is not defined')

    return new ApiFootballHttp({ baseUrl, apiKey })
}

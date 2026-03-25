import 'server-only'

interface ApiFootballResponse<T> {
    response: T
}

class ApiFootballClient {
    private readonly baseUrl: string
    private readonly apiKey: string

    constructor() {
        const baseUrl = process.env.FOOTBAL_API_BASE_URL

        if (!baseUrl) throw new Error('FOOTBAL_API_BASE_URL is not defined')

        const apiKey = process.env.FOOTBAL_API_KEY

        if (!apiKey) throw new Error('FOOTBAL_API_KEY is not defined')

        this.baseUrl = baseUrl
        this.apiKey = apiKey
    }

    async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
        const url = new URL(`${this.baseUrl}${endpoint}`)

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.set(key, String(value))
            })
        }

        const response = await fetch(url.toString(), {
            headers: {
                'x-apisports-key': this.apiKey,
            },
        })

        if (!response.ok) {
            throw new Error(`API-Football request failed: ${response.status} ${response.statusText}`)
        }

        const json = (await response.json()) as ApiFootballResponse<T>

        return json.response
    }
}

export const apiFootballClient = new ApiFootballClient()

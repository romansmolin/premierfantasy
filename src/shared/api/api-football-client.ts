import 'server-only'

import { createApiFootballHttpFromEnv } from './api-football-http'

import type { ApiFootballHttp } from './api-football-http'

class ApiFootballClient {
    private readonly http: ApiFootballHttp

    constructor() {
        this.http = createApiFootballHttpFromEnv()
    }

    async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
        return (await this.http.get<T>(endpoint, params)).data
    }
}

export const apiFootballClient = new ApiFootballClient()

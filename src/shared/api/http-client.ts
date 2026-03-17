import axios, { AxiosError, AxiosInstance } from 'axios'

import { ApiError } from './api-error'
import { IHttpClient, RequestConfig } from './http-client.interface'

export class HttpClient implements IHttpClient {
    private client: AxiosInstance

    private async request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
        try {
            const response = await fn()

            return response.data
        } catch (error) {
            throw error instanceof AxiosError ? ApiError.fromAxios(error) : error
        }
    }

    constructor() {
        this.client = axios.create({
            baseURL: process.env.NEXT_PUBLIC_APP_URL,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    async get<T>(url: string, config?: RequestConfig): Promise<T> {
        return this.request(() => this.client.get<T>(url, config))
    }

    async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
        return this.request(() => this.client.post<T>(url, data, config))
    }

    async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
        return this.request(() => this.client.put<T>(url, data, config))
    }

    async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
        return this.request(() => this.client.patch<T>(url, data, config))
    }

    async delete<T>(url: string, config?: RequestConfig): Promise<T> {
        return this.request(() => this.client.delete<T>(url, config))
    }
}

export const httpClient = new HttpClient()

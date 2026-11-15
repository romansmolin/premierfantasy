import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { BuilderPool, SavedSquad, SquadInput } from '../model/squad.types'

const wrap = async <T>(call: () => Promise<T>, fallback: string): Promise<T> => {
    try {
        return await call()
    } catch (error) {
        throw ApiError.isApiError(error) ? error : new ApiError(500, fallback)
    }
}

export const squadService = {
    getPool: () => wrap(() => httpClient.get<BuilderPool>('/api/builder/pool'), 'Failed to load players'),
    list: () => wrap(() => httpClient.get<SavedSquad[]>('/api/squads'), 'Failed to load squads'),
    create: (input: SquadInput) =>
        wrap(() => httpClient.post<SavedSquad>('/api/squads', input), 'Failed to save the squad'),
    update: (id: string, input: SquadInput) =>
        wrap(() => httpClient.put<SavedSquad>(`/api/squads/${id}`, input), 'Failed to save the squad'),
    remove: (id: string) =>
        wrap(() => httpClient.delete<{ ok: true }>(`/api/squads/${id}`), 'Failed to delete the squad'),
}

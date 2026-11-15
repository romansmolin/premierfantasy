import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { AutoBuildRequest, AutoBuildResult, SquadReview } from '../model/autobuild.types'
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
    autoBuild: (request: AutoBuildRequest) =>
        wrap(() => httpClient.post<AutoBuildResult>('/api/autobuild', request), 'Auto-build failed'),
    review: (id: string, refresh = false) =>
        wrap(
            () => httpClient.post<SquadReview>(`/api/squads/${id}/review`, { refresh }),
            'Squad review failed',
        ),
}

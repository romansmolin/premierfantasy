import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'
import { reviveDates } from '@/shared/lib/revive-dates'

import type { ScoutCompare, ScoutList, ScoutProfile } from '../model/scout.types'

const load = async <T>(url: string, fallback: string): Promise<T> => {
    try {
        return reviveDates<T>(await httpClient.get<unknown>(url))
    } catch (error) {
        throw ApiError.isApiError(error) ? error : new ApiError(500, fallback)
    }
}

export const scoutService = {
    getList: () => load<ScoutList>('/api/scout/players', 'Failed to load players'),
    getProfile: (id: string) =>
        load<ScoutProfile>(`/api/scout/players/${encodeURIComponent(id)}`, 'Failed to load the player'),
    compare: (ids: string[]) =>
        load<ScoutCompare>(
            `/api/scout/compare?ids=${ids.map(encodeURIComponent).join(',')}`,
            'Failed to compare the players',
        ),
}

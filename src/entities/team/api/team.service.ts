import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import { ITeamResponse } from '../model/team.types'

export const getAllTeams = async (): Promise<ITeamResponse[]> => {
    try {
        const teams = await httpClient.get<ITeamResponse[]>('/api/teams')

        return teams
    } catch (error: unknown) {
        throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed tp fetch all teams')
    }
}

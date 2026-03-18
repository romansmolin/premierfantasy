import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type { ISquadPlayer, ITeamResponse } from '../model/team.types'

export const getAllTeams = async (): Promise<ITeamResponse[]> => {
    try {
        const teams = await httpClient.get<ITeamResponse[]>('/api/teams')

        return teams
    } catch (error: unknown) {
        throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed tp fetch all teams')
    }
}

export const getTeamsPlayersByTeamId = async (teamId: number): Promise<ISquadPlayer[]> => {
    try {
        const teamPlayers = await httpClient.get<ISquadPlayer[]>(`/api/teams/${teamId}/players`)

        return teamPlayers
    } catch (error: unknown) {
        throw ApiError.isApiError(error)
            ? error
            : new ApiError(500, `Failed to fetch players for teams with id ${teamId}`)
    }
}

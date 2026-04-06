import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import type {
    ICreateFantasyTeam,
    ICreateTransfer,
    IFantasyTeam,
    ISquadPlayer,
    ISquadPlayerWithStats,
    ITransferInfo,
} from '../model/fantasy-team.types'

const BASE_URL = '/api/fantasy-teams'

interface SaveSquadPlayer {
    id: number
    name: string
    position: 'GK' | 'DEF' | 'MID' | 'FWD'
    price: number
    teamId: number
}

export const fantasyTeamService = {
    async getByUserId(userId: string): Promise<IFantasyTeam[]> {
        try {
            return await httpClient.get<IFantasyTeam[]>(`${BASE_URL}/user/${userId}`)
        } catch (error) {
            throw ApiError.isApiError(error)
                ? error
                : new ApiError(500, `Failed to fetch fantasy teams for user ${userId}`)
        }
    },

    async getById(id: string): Promise<IFantasyTeam> {
        try {
            return await httpClient.get<IFantasyTeam>(`${BASE_URL}/${id}`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, `Failed to fetch fantasy team ${id}`)
        }
    },

    async create(data: ICreateFantasyTeam): Promise<IFantasyTeam> {
        try {
            return await httpClient.post<IFantasyTeam>(BASE_URL, data)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to create fantasy team')
        }
    },

    async update(id: string, data: Partial<ICreateFantasyTeam>): Promise<IFantasyTeam> {
        try {
            return await httpClient.patch<IFantasyTeam>(`${BASE_URL}/${id}`, data)
        } catch (error) {
            throw ApiError.isApiError(error)
                ? error
                : new ApiError(500, `Failed to update fantasy team ${id}`)
        }
    },

    async delete(id: string): Promise<void> {
        try {
            return await httpClient.delete<void>(`${BASE_URL}/${id}`)
        } catch (error) {
            throw ApiError.isApiError(error)
                ? error
                : new ApiError(500, `Failed to delete fantasy team ${id}`)
        }
    },

    async getSquad(teamId: string): Promise<ISquadPlayer[]> {
        try {
            return await httpClient.get<ISquadPlayer[]>(`${BASE_URL}/${teamId}/squad`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch squad')
        }
    },

    async saveSquad(teamId: string, players: SaveSquadPlayer[]): Promise<void> {
        try {
            await httpClient.post(`${BASE_URL}/${teamId}/squad`, { players })
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to save squad')
        }
    },

    async getSquadGameweekStats(teamId: string, gameweekNumber: number): Promise<ISquadPlayerWithStats[]> {
        try {
            return await httpClient.get<ISquadPlayerWithStats[]>(
                `${BASE_URL}/${teamId}/gameweek/${gameweekNumber}`,
            )
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch gameweek stats')
        }
    },

    async getTransferInfo(teamId: string): Promise<ITransferInfo> {
        try {
            return await httpClient.get<ITransferInfo>(`${BASE_URL}/${teamId}/transfers`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch transfer info')
        }
    },

    async makeTransfer(teamId: string, data: ICreateTransfer[]): Promise<void> {
        try {
            await httpClient.post(`${BASE_URL}/${teamId}/transfers`, data)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to make transfer')
        }
    },
}

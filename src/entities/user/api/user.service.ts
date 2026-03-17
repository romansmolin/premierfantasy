import { ApiError } from '@/shared/api/api-error'
import { httpClient } from '@/shared/api/http-client'

import { IUser, IUserProfile } from '../model/user.types'

const BASE_URL = '/api/users'

export const userService = {
    async getAll(): Promise<IUser[]> {
        try {
            return await httpClient.get<IUser[]>(BASE_URL)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to fetch users')
        }
    },

    async getById(id: string | undefined): Promise<IUserProfile> {
        try {
            return await httpClient.get<IUserProfile>(`${BASE_URL}/${id}`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, `Failed to fetch user ${id}`)
        }
    },

    async create(data: Pick<IUser, 'name' | 'email'>): Promise<IUser> {
        try {
            return await httpClient.post<IUser>(BASE_URL, data)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, 'Failed to create user')
        }
    },

    async update(id: string, data: Partial<Pick<IUser, 'name' | 'email' | 'image'>>): Promise<IUser> {
        try {
            return await httpClient.patch<IUser>(`${BASE_URL}/${id}`, data)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, `Failed to update user ${id}`)
        }
    },

    async delete(id: string): Promise<void> {
        try {
            return await httpClient.delete<void>(`${BASE_URL}/${id}`)
        } catch (error) {
            throw ApiError.isApiError(error) ? error : new ApiError(500, `Failed to delete user ${id}`)
        }
    },
}

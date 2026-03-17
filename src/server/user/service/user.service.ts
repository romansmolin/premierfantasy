import { IFantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository.interface'

import type { IUser, IUserProfile } from '@/entities/user/model/user.types'

import { IUserRepository } from '../repository/user.repository.interface'

import { IUserService } from './user.service.interface'

export class UserService implements IUserService {
    private readonly userRepository
    private readonly fantasyTeamRepository

    constructor(userRepository: IUserRepository, fantasyTeamRepository: IFantasyTeamRepository) {
        this.userRepository = userRepository
        this.fantasyTeamRepository = fantasyTeamRepository
    }

    async getUser(id: string): Promise<IUserProfile | null> {
        const [userInfoResult, fantasyTeamsResult] = await Promise.allSettled([
            this.userRepository.findById(id),
            this.fantasyTeamRepository.findByUserId(id),
        ])

        if (userInfoResult.status === 'rejected') {
            throw new Error(`Failed to fetch user: ${userInfoResult.reason}`)
        }

        if (!userInfoResult.value) return null

        return {
            userInfo: userInfoResult.value,
            userFantasyTeams: fantasyTeamsResult.status === 'fulfilled' ? fantasyTeamsResult.value : [],
        }
    }

    async getAllUsers(): Promise<IUser[]> {
        return this.userRepository.findAll()
    }

    async createUser(data: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
        const existing = await this.userRepository.findByEmail(data.email)

        if (existing) throw new Error('User with this email already exists')

        return this.userRepository.create(data)
    }

    async updateUser(id: string, data: Partial<IUser>): Promise<IUser> {
        return this.userRepository.update(id, data)
    }

    async deleteUser(id: string): Promise<void> {
        return this.userRepository.delete(id)
    }
}

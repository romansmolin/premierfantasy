import type { IUser } from '@/entities/user/model/user.types'

import type { IUserRepository } from '../repository/user.repository.interface'

import type { IUserService } from './user.service.interface'

export class UserService implements IUserService {
    private readonly userRepository

    constructor(userRepository: IUserRepository) {
        this.userRepository = userRepository
    }

    async getUser(id: string): Promise<IUser | null> {
        return this.userRepository.findById(id)
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

import { User } from '@/entities/user/model/user.types'

import { IUserRepository } from '../repository/user.repository.interface'

import { IUserService } from './user.service.interface'

export class UserService implements IUserService {
    private readonly userRepository

    constructor(userRepository: IUserRepository) {
        this.userRepository = userRepository
    }

    async getUser(id: string): Promise<User | null> {
        return this.userRepository.findById(id)
    }

    async getAllUsers(): Promise<User[]> {
        return this.userRepository.findAll()
    }

    async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
        const existing = await this.userRepository.findByEmail(data.email)

        if (existing) throw new Error('User with this email already exists')

        return this.userRepository.create(data)
    }

    async updateUser(id: string, data: Partial<User>): Promise<User> {
        return this.userRepository.update(id, data)
    }

    async deleteUser(id: string): Promise<void> {
        return this.userRepository.delete(id)
    }
}

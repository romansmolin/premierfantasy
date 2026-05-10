import { hashPassword, verifyPassword } from 'better-auth/crypto'

import type { IUser } from '@/entities/user/model/user.types'

import { Errors } from '@/shared/lib/http'

import type { IUserService } from './user.service.interface'
import type { IUserRepository } from '../repository/user.repository.interface'

export class UserService implements IUserService {
    private readonly userRepository: IUserRepository

    constructor(userRepository: IUserRepository) {
        this.userRepository = userRepository
    }

    async getUser(id: string): Promise<IUser | null> {
        return this.userRepository.findById(id)
    }

    async updateUser(id: string, data: Partial<IUser>): Promise<IUser> {
        return this.userRepository.update(id, data)
    }

    async deleteUser(id: string): Promise<void> {
        return this.userRepository.delete(id)
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        const account = await this.userRepository.findCredentialAccount(userId)

        if (!account?.password) {
            throw Errors.badRequest('No password set for this account')
        }

        const isValid = await verifyPassword({ hash: account.password, password: currentPassword })

        if (!isValid) {
            throw Errors.badRequest('Current password is incorrect')
        }

        const hashedPassword = await hashPassword(newPassword)

        await this.userRepository.updateCredentialPassword(account.id, hashedPassword)
    }

    async updateAvatar(userId: string, image: string | null): Promise<IUser> {
        return this.userRepository.update(userId, { image })
    }
}

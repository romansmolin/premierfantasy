import { User } from '@/entities/user/model/user.types'

import { prisma } from '@/shared/lib/prisma'

import { IUserRepository } from './user.repository.interface'

export class UserRepository implements IUserRepository {
    async findById(id: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { id } })
    }

    async findByEmail(email: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { email } })
    }

    async findAll(): Promise<User[]> {
        return prisma.user.findMany()
    }

    async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
        return prisma.user.create({ data })
    }

    async update(id: string, data: Partial<User>): Promise<User> {
        return prisma.user.update({ where: { id }, data })
    }

    async delete(id: string): Promise<void> {
        await prisma.user.delete({ where: { id } })
    }
}

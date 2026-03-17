import { IUser } from '@/entities/user/model/user.types'

import { prisma } from '@/shared/lib/prisma'

import { IUserRepository } from './user.repository.interface'

export class UserRepository implements IUserRepository {
    async findById(id: string): Promise<IUser | null> {
        return prisma.user.findUnique({ where: { id } })
    }

    async findByEmail(email: string): Promise<IUser | null> {
        return prisma.user.findUnique({ where: { email } })
    }

    async findAll(): Promise<IUser[]> {
        return prisma.user.findMany()
    }

    async create(data: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
        return prisma.user.create({ data })
    }

    async update(id: string, data: Partial<IUser>): Promise<IUser> {
        return prisma.user.update({ where: { id }, data })
    }

    async delete(id: string): Promise<void> {
        await prisma.user.delete({ where: { id } })
    }
}

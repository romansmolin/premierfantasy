import type { IUser } from '@/entities/user/model/user.types'

import { prisma } from '@/shared/lib/prisma'

import type { ICredentialAccount, IUserRepository } from './user.repository.interface'

export class UserRepository implements IUserRepository {
    async findById(id: string): Promise<IUser | null> {
        return prisma.user.findUnique({ where: { id } })
    }

    async update(id: string, data: Partial<IUser>): Promise<IUser> {
        return prisma.user.update({ where: { id }, data })
    }

    async delete(id: string): Promise<void> {
        await prisma.user.delete({ where: { id } })
    }

    async findCredentialAccount(userId: string): Promise<ICredentialAccount | null> {
        const account = await prisma.account.findFirst({
            where: { userId, providerId: 'credential' },
            select: { id: true, password: true },
        })

        return account
    }

    async updateCredentialPassword(accountId: string, hashedPassword: string): Promise<void> {
        await prisma.account.update({
            where: { id: accountId },
            data: { password: hashedPassword },
        })
    }
}

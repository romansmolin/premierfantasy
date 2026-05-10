import type { IUser } from '@/entities/user/model/user.types'

export interface ICredentialAccount {
    id: string
    password: string | null
}

export interface IUserRepository {
    findById(id: string): Promise<IUser | null>
    update(id: string, data: Partial<IUser>): Promise<IUser>
    delete(id: string): Promise<void>
    findCredentialAccount(userId: string): Promise<ICredentialAccount | null>
    updateCredentialPassword(accountId: string, hashedPassword: string): Promise<void>
}

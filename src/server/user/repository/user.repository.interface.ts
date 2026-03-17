import { IUser } from '@/entities/user/model/user.types'

export interface IUserRepository {
    findById(id: string): Promise<IUser | null>
    findByEmail(email: string): Promise<IUser | null>
    findAll(): Promise<IUser[]>
    create(data: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser>
    update(id: string, data: Partial<IUser>): Promise<IUser>
    delete(id: string): Promise<void>
}

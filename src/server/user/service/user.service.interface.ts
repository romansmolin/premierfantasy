import type { IUser, IUserProfile } from '@/entities/user/model/user.types'

export interface IUserService {
    getUser(id: string): Promise<IUserProfile | null>
    getAllUsers(): Promise<IUser[]>
    createUser(data: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser>
    updateUser(id: string, data: Partial<IUser>): Promise<IUser>
    deleteUser(id: string): Promise<void>
}

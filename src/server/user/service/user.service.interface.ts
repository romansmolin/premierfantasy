import { User } from '@/entities/user/model/user.types'

export interface IUserService {
    getUser(id: string): Promise<User | null>
    getAllUsers(): Promise<User[]>
    createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>
    updateUser(id: string, data: Partial<User>): Promise<User>
    deleteUser(id: string): Promise<void>
}

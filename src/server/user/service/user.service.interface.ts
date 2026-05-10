import type { IUser } from '@/entities/user/model/user.types'

export interface IUserService {
    getUser(id: string): Promise<IUser | null>
    updateUser(id: string, data: Partial<IUser>): Promise<IUser>
    deleteUser(id: string): Promise<void>
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>
    updateAvatar(userId: string, image: string | null): Promise<IUser>
}

export interface IUser {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    coinBalance: number
    createdAt: Date
    updatedAt: Date
}

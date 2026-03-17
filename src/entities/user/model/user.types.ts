import type { IFantasyTeam } from '@/entities/fantasy-team/model/fantasy-team.types'

export interface IUser {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    createdAt: Date
    updatedAt: Date
}

export interface IUserProfile {
    userInfo: IUser
    userFantasyTeams: IFantasyTeam[]
}

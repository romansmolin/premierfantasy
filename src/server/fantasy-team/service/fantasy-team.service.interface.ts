import type { ICreateFantasyTeam, IFantasyTeam } from '@/entities/fantasy-team/model/fantasy-team.types'

export interface IFantasyTeamService {
    getFantasyTeam(id: string): Promise<IFantasyTeam | null>
    getFantasyTeamsByUser(userId: string): Promise<IFantasyTeam[]>
    getAllFantasyTeams(): Promise<IFantasyTeam[]>
    createFantasyTeam(data: ICreateFantasyTeam): Promise<IFantasyTeam>
    updateFantasyTeam(id: string, data: Partial<IFantasyTeam>): Promise<IFantasyTeam>
    deleteFantasyTeam(id: string): Promise<void>
}

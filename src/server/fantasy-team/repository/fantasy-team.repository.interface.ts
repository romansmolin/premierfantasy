import type { ICreateFantasyTeam, IFantasyTeam } from '@/entities/fantasy-team/model/fantasy-team.types'

export interface IFantasyTeamRepository {
    findById(id: string): Promise<IFantasyTeam | null>
    findByUserId(userId: string): Promise<IFantasyTeam[]>
    findByUserAndCompetition(userId: string, competitionId: string): Promise<IFantasyTeam | null>
    findAll(): Promise<IFantasyTeam[]>
    create(data: ICreateFantasyTeam): Promise<IFantasyTeam>
    update(id: string, data: Partial<IFantasyTeam>): Promise<IFantasyTeam>
    delete(id: string): Promise<void>
}

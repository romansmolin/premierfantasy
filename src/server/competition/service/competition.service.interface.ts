import type {
    ICompetition,
    ICompetitionState,
    ICreateCompetition,
    ILeaderboard,
} from '@/entities/competition/model/competition.types'

export interface ICompetitionService {
    getCompetition(id: string): Promise<ICompetition | null>
    getAllCompetitions(): Promise<ICompetition[]>
    createCompetition(data: ICreateCompetition): Promise<ICompetition>
    updateCompetition(id: string, data: Partial<ICreateCompetition>): Promise<ICompetition>
    deleteCompetition(id: string): Promise<void>
    getLeaderboard(competitionId: string): Promise<ILeaderboard>
    getActiveCompetition(): Promise<ICompetition | null>
    getUpcomingCompetition(): Promise<ICompetition | null>
    getCompetitionState(userId: string): Promise<ICompetitionState>
    generateRollingCompetitions(totalGameweeks: number): Promise<void>
    transitionCompetitions(): Promise<void>
}

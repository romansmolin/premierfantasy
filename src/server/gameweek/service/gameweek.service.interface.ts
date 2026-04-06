import type { IGameweek } from '@/entities/gameweek/model/gameweek.types'

export interface IGameweekService {
    getAllGameweeks(): Promise<IGameweek[]>
    getGameweek(id: string): Promise<IGameweek | null>
    getActiveGameweek(): Promise<IGameweek | null>
    syncFromApi(season: number, leagueId: number): Promise<IGameweek[]>
    activateGameweek(gameweekNumber: number): Promise<IGameweek>
    finalizeGameweek(gameweekId: string): Promise<IGameweek>
    getCurrentGameweek(): Promise<IGameweek | null>
    getUnfinishedPastGameweeks(): Promise<IGameweek[]>
}

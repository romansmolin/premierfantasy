import type { ICreateGameweek, IGameweek } from '@/entities/gameweek/model/gameweek.types'

export interface IGameweekRepository {
    findAll(): Promise<IGameweek[]>
    findById(id: string): Promise<IGameweek | null>
    findByNumber(number: number): Promise<IGameweek | null>
    findActive(): Promise<IGameweek | null>
    create(data: ICreateGameweek): Promise<IGameweek>
    upsertByNumber(data: ICreateGameweek & { deadline?: Date }): Promise<IGameweek>
    setActive(gameweekId: string): Promise<IGameweek>
    setFinished(gameweekId: string): Promise<IGameweek>
}

import type { SavedSquad, SquadInput } from '@/entities/squad/model/squad.types'

export interface ISquadService {
    list(userId: string): Promise<SavedSquad[]>
    get(userId: string, id: string): Promise<SavedSquad>
    /** 422 with the broken rules when the squad is not valid. */
    create(userId: string, input: SquadInput): Promise<SavedSquad>
    update(userId: string, id: string, input: SquadInput): Promise<SavedSquad>
    remove(userId: string, id: string): Promise<void>
}

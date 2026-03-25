import type { IGameweek } from '@/entities/gameweek/model/gameweek.types'

import { apiFootballClient } from '@/shared/api/api-football-client'

import type { IGameweekService } from './gameweek.service.interface'
import type { IGameweekRepository } from '../repository/gameweek.repository.interface'

interface ApiFixture {
    fixture: {
        id: number
        date: string
    }
}

const HOURS_BUFFER = 3
const DEADLINE_HOURS_BEFORE = 1

function parseRoundNumber(roundName: string): number | null {
    const match = roundName.match(/(\d+)$/)

    return match ? parseInt(match[1], 10) : null
}

export class GameweekService implements IGameweekService {
    private readonly gameweekRepository: IGameweekRepository

    constructor(gameweekRepository: IGameweekRepository) {
        this.gameweekRepository = gameweekRepository
    }

    async getAllGameweeks(): Promise<IGameweek[]> {
        return this.gameweekRepository.findAll()
    }

    async getGameweek(id: string): Promise<IGameweek | null> {
        return this.gameweekRepository.findById(id)
    }

    async getActiveGameweek(): Promise<IGameweek | null> {
        return this.gameweekRepository.findActive()
    }

    async syncFromApi(season: number, leagueId: number): Promise<IGameweek[]> {
        const rounds = await apiFootballClient.get<string[]>('/fixtures/rounds', {
            league: leagueId,
            season,
        })

        const upserted: IGameweek[] = []

        for (const roundName of rounds) {
            const roundNumber = parseRoundNumber(roundName)

            if (roundNumber === null) continue

            const fixtures = await apiFootballClient.get<ApiFixture[]>('/fixtures', {
                league: leagueId,
                season,
                round: roundName,
            })

            if (fixtures.length === 0) continue

            const dates = fixtures.map((f) => new Date(f.fixture.date).getTime())
            const earliestDate = new Date(Math.min(...dates))
            const latestDate = new Date(Math.max(...dates))

            const endDate = new Date(latestDate.getTime() + HOURS_BUFFER * 60 * 60 * 1000)
            const deadline = new Date(earliestDate.getTime() - DEADLINE_HOURS_BEFORE * 60 * 60 * 1000)

            const gameweek = await this.gameweekRepository.upsertByNumber({
                number: roundNumber,
                startDate: earliestDate,
                endDate,
                deadline,
            })

            upserted.push(gameweek)
        }

        return upserted
    }

    async activateGameweek(gameweekNumber: number): Promise<IGameweek> {
        const gameweek = await this.gameweekRepository.findByNumber(gameweekNumber)

        if (!gameweek) {
            throw new Error(`Gameweek ${gameweekNumber} not found`)
        }

        return this.gameweekRepository.setActive(gameweek.id)
    }

    async finalizeGameweek(gameweekId: string): Promise<IGameweek> {
        const gameweek = await this.gameweekRepository.findById(gameweekId)

        if (!gameweek) {
            throw new Error(`Gameweek ${gameweekId} not found`)
        }

        if (gameweek.isFinished) {
            throw new Error(`Gameweek ${gameweek.number} is already finalized`)
        }

        return this.gameweekRepository.setFinished(gameweekId)
    }
}

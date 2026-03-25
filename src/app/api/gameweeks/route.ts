import { NextRequest } from 'next/server'

import { GameweekController } from '@/server/gameweek/controller/gameweek.controller'
import { GameweekRepository } from '@/server/gameweek/repository/gameweek.repository'
import { GameweekService } from '@/server/gameweek/service/gameweek.service'

const gameweekRepository = new GameweekRepository()
const gameweekService = new GameweekService(gameweekRepository)
const gameweekController = new GameweekController(gameweekService)

export async function GET() {
    return gameweekController.getAll()
}

export async function POST(req: NextRequest) {
    return gameweekController.sync(req)
}

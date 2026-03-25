import { GameweekController } from '@/server/gameweek/controller/gameweek.controller'
import { GameweekRepository } from '@/server/gameweek/repository/gameweek.repository'
import { GameweekService } from '@/server/gameweek/service/gameweek.service'

import type { NextRequest } from 'next/server'

const gameweekRepository = new GameweekRepository()
const gameweekService = new GameweekService(gameweekRepository)
const gameweekController = new GameweekController(gameweekService)

export async function GET() {
    return gameweekController.getActive()
}

export async function PATCH(req: NextRequest) {
    return gameweekController.activate(req)
}

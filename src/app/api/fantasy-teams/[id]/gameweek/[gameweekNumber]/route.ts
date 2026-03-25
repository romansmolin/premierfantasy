import { NextRequest } from 'next/server'

import { FantasyTeamController } from '@/server/fantasy-team/controller/fantasy-team.controller'
import { FantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository'
import { FantasyTeamService } from '@/server/fantasy-team/service/fantasy-team.service'
import { GameweekRepository } from '@/server/gameweek/repository/gameweek.repository'

const fantasyTeamRepository = new FantasyTeamRepository()
const gameweekRepository = new GameweekRepository()
const fantasyTeamService = new FantasyTeamService(fantasyTeamRepository, gameweekRepository)
const fantasyTeamController = new FantasyTeamController(fantasyTeamService)

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; gameweekNumber: string }> },
) {
    const { id, gameweekNumber } = await params

    return fantasyTeamController.getSquadWithGameweekStats(id, Number(gameweekNumber))
}

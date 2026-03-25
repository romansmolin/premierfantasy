import { CompetitionController } from '@/server/competition/controller/competition.controller'
import { CompetitionRepository } from '@/server/competition/repository/competition.repository'
import { CompetitionService } from '@/server/competition/service/competition.service'
import { FantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository'
import { GameweekRepository } from '@/server/gameweek/repository/gameweek.repository'

import type { NextRequest } from 'next/server'

const competitionRepository = new CompetitionRepository()
const fantasyTeamRepository = new FantasyTeamRepository()
const gameweekRepository = new GameweekRepository()
const competitionService = new CompetitionService(
    competitionRepository,
    fantasyTeamRepository,
    gameweekRepository,
)
const competitionController = new CompetitionController(competitionService)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return competitionController.getLeaderboard(id)
}

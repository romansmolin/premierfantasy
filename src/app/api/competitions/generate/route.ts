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

export async function POST(req: NextRequest) {
    return competitionController.generateCompetitions(req)
}

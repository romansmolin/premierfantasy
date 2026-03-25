import { FantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository'
import { GameweekRepository } from '@/server/gameweek/repository/gameweek.repository'
import { PlayerGameweekStatsRepository } from '@/server/player-gameweek-stats/repository/player-gameweek-stats.repository'
import { ScoringController } from '@/server/scoring/controller/scoring.controller'
import { ScoringService } from '@/server/scoring/service/scoring.service'

import type { NextRequest } from 'next/server'

const gameweekRepository = new GameweekRepository()
const playerGameweekStatsRepository = new PlayerGameweekStatsRepository()
const fantasyTeamRepository = new FantasyTeamRepository()
const scoringService = new ScoringService(
    gameweekRepository,
    playerGameweekStatsRepository,
    fantasyTeamRepository,
)
const scoringController = new ScoringController(scoringService)

export async function POST(req: NextRequest) {
    return scoringController.calculateGameweek(req)
}

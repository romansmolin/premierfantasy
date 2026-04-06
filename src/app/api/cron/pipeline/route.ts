import { NextRequest, NextResponse } from 'next/server'

import { CompetitionRepository } from '@/server/competition/repository/competition.repository'
import { CompetitionService } from '@/server/competition/service/competition.service'
import { FantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository'
import { GameweekRepository } from '@/server/gameweek/repository/gameweek.repository'
import { GameweekService } from '@/server/gameweek/service/gameweek.service'
import { OrchestratorService } from '@/server/orchestrator/service/orchestrator.service'
import { PlayerGameweekStatsRepository } from '@/server/player-gameweek-stats/repository/player-gameweek-stats.repository'
import { ScoringService } from '@/server/scoring/service/scoring.service'
import { WalletRepository } from '@/server/wallet/repository/wallet.repository'
import { WalletService } from '@/server/wallet/service/wallet.service'

const gameweekRepository = new GameweekRepository()
const gameweekService = new GameweekService(gameweekRepository)

const playerGameweekStatsRepository = new PlayerGameweekStatsRepository()
const fantasyTeamRepository = new FantasyTeamRepository()
const scoringService = new ScoringService(
    gameweekRepository,
    playerGameweekStatsRepository,
    fantasyTeamRepository,
)

const competitionRepository = new CompetitionRepository()
const walletRepository = new WalletRepository()
const walletService = new WalletService(walletRepository)
const competitionService = new CompetitionService(
    competitionRepository,
    fantasyTeamRepository,
    gameweekRepository,
    walletService,
)

const orchestratorService = new OrchestratorService(gameweekService, scoringService, competitionService)

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization')

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const result = await orchestratorService.runPipeline()

        return NextResponse.json(result)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Pipeline failed'

        return NextResponse.json({ error: message }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server'

import { CompetitionRepository } from '@/server/competition/repository/competition.repository'
import { CompetitionService } from '@/server/competition/service/competition.service'
import { FantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository'
import { GameweekRepository } from '@/server/gameweek/repository/gameweek.repository'

const competitionRepository = new CompetitionRepository()
const fantasyTeamRepository = new FantasyTeamRepository()
const gameweekRepository = new GameweekRepository()
const competitionService = new CompetitionService(
    competitionRepository,
    fantasyTeamRepository,
    gameweekRepository,
)

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization')

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        await competitionService.transitionCompetitions()

        return NextResponse.json({ success: true })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to transition competitions'

        return NextResponse.json({ error: message }, { status: 500 })
    }
}

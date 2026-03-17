import { NextRequest } from 'next/server'

import { FantasyTeamController } from '@/server/fantasy-team/controller/fantasy-team.controller'
import { FantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository'
import { FantasyTeamService } from '@/server/fantasy-team/service/fantasy-team.service'

const fantasyTeamRepository = new FantasyTeamRepository()
const fantasyTeamService = new FantasyTeamService(fantasyTeamRepository)
const fantasyTeamController = new FantasyTeamController(fantasyTeamService)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    const { userId } = await params

    return fantasyTeamController.getByUserId(userId)
}

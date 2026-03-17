import { NextRequest } from 'next/server'

import { FantasyTeamController } from '@/server/fantasy-team/controller/fantasy-team.controller'
import { FantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository'
import { FantasyTeamService } from '@/server/fantasy-team/service/fantasy-team.service'

const fantasyTeamRepository = new FantasyTeamRepository()
const fantasyTeamService = new FantasyTeamService(fantasyTeamRepository)
const fantasyTeamController = new FantasyTeamController(fantasyTeamService)

export async function GET() {
    return fantasyTeamController.getAll()
}

export async function POST(req: NextRequest) {
    return fantasyTeamController.create(req)
}

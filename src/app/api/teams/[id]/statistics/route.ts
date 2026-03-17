import { NextRequest } from 'next/server'

import { TeamController } from '@/server/teams/controller/team.controller'
import { TeamRepository } from '@/server/teams/repository/team.repositroy'
import { TeamService } from '@/server/teams/service/team.service'

const teamRepository = new TeamRepository()
const teamService = new TeamService(teamRepository)
const teamController = new TeamController(teamService)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return teamController.getTeamStatistics(req, id)
}

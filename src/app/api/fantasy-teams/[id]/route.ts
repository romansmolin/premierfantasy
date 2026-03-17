import { NextRequest } from 'next/server'

import { FantasyTeamController } from '@/server/fantasy-team/controller/fantasy-team.controller'
import { FantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository'
import { FantasyTeamService } from '@/server/fantasy-team/service/fantasy-team.service'

const fantasyTeamRepository = new FantasyTeamRepository()
const fantasyTeamService = new FantasyTeamService(fantasyTeamRepository)
const fantasyTeamController = new FantasyTeamController(fantasyTeamService)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return fantasyTeamController.getById(id)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return fantasyTeamController.update(req, id)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return fantasyTeamController.delete(id)
}

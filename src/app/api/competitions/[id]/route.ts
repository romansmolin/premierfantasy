import { NextRequest } from 'next/server'

import { CompetitionController } from '@/server/competition/controller/competition.controller'
import { CompetitionRepository } from '@/server/competition/repository/competition.repository'
import { CompetitionService } from '@/server/competition/service/competition.service'

const competitionRepository = new CompetitionRepository()
const competitionService = new CompetitionService(competitionRepository)
const competitionController = new CompetitionController(competitionService)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return competitionController.getById(id)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return competitionController.delete(id)
}

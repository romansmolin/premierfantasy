import { AIController } from '@/server/ai/controller/ai.controller'
import { AITransferService } from '@/server/ai/service/ai-transfer.service'
import { FantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository'

import type { NextRequest } from 'next/server'

const fantasyTeamRepository = new FantasyTeamRepository()
const aiTransferService = new AITransferService(fantasyTeamRepository)
const aiController = new AIController(aiTransferService)

export async function GET(req: NextRequest) {
    return aiController.getTransferSuggestions(req)
}

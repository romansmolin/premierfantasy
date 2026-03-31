import { TeamController } from '@/server/teams/controller/team.controller'
import { TeamRepository } from '@/server/teams/repository/team.repositroy'
import { TeamService } from '@/server/teams/service/team.service'

import type { NextRequest } from 'next/server'

const teamRepository = new TeamRepository()
const teamService = new TeamService(teamRepository)
const teamController = new TeamController(teamService)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const now = new Date()
    const currentSeason = now.getMonth() + 1 >= 8 ? now.getFullYear() : now.getFullYear() - 1
    const season = Number(_req.nextUrl.searchParams.get('season') ?? String(currentSeason))

    return teamController.getPlayerDetails(Number(id), season)
}

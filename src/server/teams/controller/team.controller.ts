import { NextRequest, NextResponse } from 'next/server'

import type { ITeamsService } from '../service/team.service.interface'

export class TeamController {
    private readonly teamService: ITeamsService

    constructor(teamService: ITeamsService) {
        this.teamService = teamService
    }

    async getAllTeams() {
        const teams = await this.teamService.getAllTeams(39, 2025)

        return NextResponse.json(teams)
    }

    async getTeamById(teamId: string) {
        const team = await this.teamService.getTeamById(Number(teamId))

        if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        return NextResponse.json(team)
    }

    async getTeamPlayers(teamId: string) {
        const players = await this.teamService.getTeamPlayers(Number(teamId))

        return NextResponse.json(players)
    }

    async getTeamStatistics(req: NextRequest, teamId: string) {
        const leagueId = req.nextUrl.searchParams.get('league')
        const season = req.nextUrl.searchParams.get('season')

        if (!leagueId || !season) {
            return NextResponse.json(
                { error: 'league and season query params are required' },
                { status: 400 },
            )
        }

        const statistics = await this.teamService.getTeamStatistics(
            Number(teamId),
            Number(leagueId),
            Number(season),
        )

        if (!statistics) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        return NextResponse.json(statistics)
    }

    async getPlayerDetails(playerId: number, season: number) {
        try {
            const player = await this.teamService.getPlayerDetails(playerId, season)

            if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

            return NextResponse.json(player)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch player details'

            return NextResponse.json({ error: message }, { status: 500 })
        }
    }
}

import type { AutoBuildRequest, AutoBuildResult } from '@/entities/squad/model/autobuild.types'

export interface IAutoBuildService {
    /** 300 Credits; cached per set of constraints and gameweek. 422 when the forecast is off, prices are missing or the constraints cannot be met. */
    build(userId: string, request: AutoBuildRequest): Promise<AutoBuildResult>
}

export interface ExplainContext {
    event: number
    totalTenths: number
    expectedXi: number
    captain: string
    players: {
        name: string
        club: string
        position: string
        priceTenths: number
        forecast: number
        form: number | null
        starter: boolean
        note: string | null
    }[]
    locked: string[]
    excluded: string[]
}

export interface IAutoBuildExplainer {
    explain(context: ExplainContext): Promise<string>
}

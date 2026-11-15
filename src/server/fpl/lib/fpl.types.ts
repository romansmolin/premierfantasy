/** Only the FPL fields we read. FPL is an unofficial source: keep this surface small. */
export interface FplBootstrap {
    elements: {
        id: number
        code: number
        web_name: string
        first_name: string
        second_name: string
        team: number
        /** 1 GK, 2 DEF, 3 MID, 4 FWD */
        element_type: number
        /** Price in tenths of a million (62 = £6.2m). */
        now_cost: number
        status: string
        chance_of_playing_next_round: number | null
        news: string
        minutes: number
    }[]
    teams: { id: number; code: number; name: string; short_name: string }[]
    events: {
        id: number
        name: string
        deadline_time: string
        finished: boolean
        is_current: boolean
        is_next: boolean
    }[]
    game_settings: {
        squad_squadsize: number
        squad_squadplay: number
        squad_total_spend: number
        squad_team_limit: number
    }
    element_types: { id: number; squad_select: number; squad_min_play: number; squad_max_play: number }[]
}

export type FplElement = FplBootstrap['elements'][number]
export type FplTeam = FplBootstrap['teams'][number]

export interface FplFixture {
    id: number
    /** Null for postponed fixtures that are not scheduled in an event yet. */
    event: number | null
    kickoff_time: string | null
    team_h: number
    team_a: number
    finished: boolean
}

export interface FplEventLive {
    elements: { id: number; stats: { total_points: number; minutes: number } }[]
}

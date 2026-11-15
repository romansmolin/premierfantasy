import { PlayersListView } from '@/views/stats'

import { getPlayersCached } from '../_lib/stats-cache'

import type { Position } from '@/server/prediction/lib/scoring-rules'
import type { PlayerSort } from '@/server/stats/service/stats.service.interface'
import type { Metadata } from 'next'

// Reads the database: render per request (data itself is cached for an hour), never at build time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Premier League players: stats, form and prices',
    description:
        'Season statistics, recent form, FPL prices and expected points of every Premier League player, for fantasy football planning.',
    alternates: { canonical: '/players' },
}

const POSITIONS = ['GK', 'DEF', 'MID', 'FWD']
const SORTS = ['forecast', 'form', 'price', 'minutes', 'goals', 'assists', 'name']

type Params = { position?: string; club?: string; q?: string; sort?: string; page?: string }

export default async function PlayersPage({ searchParams }: { searchParams: Promise<Params> }) {
    const params = await searchParams
    const data = await getPlayersCached({
        position: POSITIONS.includes(params.position ?? '') ? (params.position as Position) : undefined,
        clubId: params.club || undefined,
        search: params.q?.slice(0, 60) || undefined,
        sort: SORTS.includes(params.sort ?? '') ? (params.sort as PlayerSort) : undefined,
        page: Number(params.page) || 1,
    })

    return (
        <PlayersListView data={data} params={{ position: params.position, club: params.club, q: params.q }} />
    )
}

import { unstable_cache } from 'next/cache'

import { container } from '@/shared/lib/container'

import type { PlayerListQuery } from '@/server/stats/service/stats.service.interface'

/** Public pages read our database only and refresh once an hour. */
const REVALIDATE_SECONDS = 3600

export const getPlayersCached = unstable_cache(
    (query: PlayerListQuery) => container.statsService.getPlayers(query),
    ['stats-players'],
    { revalidate: REVALIDATE_SECONDS, tags: ['stats'] },
)

export const getPlayerCached = unstable_cache(
    (id: string) => container.statsService.getPlayer(id),
    ['stats-player'],
    {
        revalidate: REVALIDATE_SECONDS,
        tags: ['stats'],
    },
)

export const getFixturesCached = unstable_cache(
    () => container.statsService.getFixtures(),
    ['stats-fixtures'],
    {
        revalidate: REVALIDATE_SECONDS,
        tags: ['stats'],
    },
)

export const getHeatmapCached = unstable_cache(() => container.statsService.getHeatmap(), ['stats-heatmap'], {
    revalidate: REVALIDATE_SECONDS,
    tags: ['stats'],
})

export const getForecastStatusCached = unstable_cache(
    () => container.statsService.getForecastStatus(),
    ['stats-forecast-status'],
    { revalidate: REVALIDATE_SECONDS, tags: ['stats'] },
)

export const listPlayerIdsCached = unstable_cache(
    () => container.statsService.listPlayerIds(),
    ['stats-player-ids'],
    {
        revalidate: REVALIDATE_SECONDS,
        tags: ['stats'],
    },
)

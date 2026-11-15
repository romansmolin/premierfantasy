import { SITE } from '@/shared/config/site'

import { listPlayerIdsCached } from './(marketing)/_lib/stats-cache'

import type { MetadataRoute } from 'next'

// Reads the database: render per request (data itself is cached for an hour), never at build time.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = SITE.url.replace(/\/$/, '')
    const fixed = ['', '/players', '/fixtures', '/how-we-calculate'].map((path) => ({
        url: `${base}${path}`,
    }))
    const ids = await listPlayerIdsCached().catch(() => [] as string[])

    return [...fixed, ...ids.map((id) => ({ url: `${base}/players/${id}` }))]
}

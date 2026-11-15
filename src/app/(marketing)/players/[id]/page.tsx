import { notFound } from 'next/navigation'

import { PlayerProfileView } from '@/views/stats'

import { getPlayerCached } from '../../_lib/stats-cache'

import type { Metadata } from 'next'

type Props = { params: Promise<{ id: string }> }

// Reads the database: render per request (data itself is cached for an hour), never at build time.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const profile = await getPlayerCached((await params).id)

    if (!profile) return { title: 'Player not found', robots: { index: false } }

    return {
        title: `${profile.player.name}: stats, form and forecast`,
        description: `${profile.player.name} (${profile.player.club.name}, ${profile.player.position}): season statistics, recent matches, FPL price and expected points.`,
        alternates: { canonical: `/players/${profile.player.id}` },
    }
}

export default async function PlayerPage({ params }: Props) {
    const profile = await getPlayerCached((await params).id)

    if (!profile) notFound()

    return <PlayerProfileView profile={profile} />
}

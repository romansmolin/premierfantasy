'use client'

import { useState } from 'react'

import { LeagueSwitcher } from '@/features/league'

import type { IMyLeague } from '@/entities/league'

import { UpcomingFixtures } from './upcoming-fixtures'

interface LeagueFixturesPanelProps {
    /** Joined leagues, already ordered — the first is selected by default. */
    leagues: IMyLeague[]
}

/**
 * Fixtures for one joined league at a time, with a switcher across the rest.
 * A single league needs no switcher, so it renders the fixtures bare.
 */
export const LeagueFixturesPanel = ({ leagues }: LeagueFixturesPanelProps) => {
    const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null)

    if (leagues.length === 0) return null

    const selected = leagues.find((league) => league.membershipId === selectedMembershipId) ?? leagues[0]

    return (
        <section className="space-y-3">
            <LeagueSwitcher
                leagues={leagues}
                selectedMembershipId={selected.membershipId}
                onSelect={(league) => setSelectedMembershipId(league.membershipId)}
            />

            <UpcomingFixtures
                key={selected.membershipId}
                leagueExternalId={selected.league.externalId}
                season={selected.season.year}
                leagueName={selected.league.name}
            />
        </section>
    )
}

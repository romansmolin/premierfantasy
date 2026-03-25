'use client'

import { Skeleton } from '@/shared/ui/skeleton'

import { useCompetitions } from '../model/use-competitions'

import { CompetitionCard } from './competition-card'

export const CompetitionList = () => {
    const { competitions, isLoading, error } = useCompetitions()

    if (isLoading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
            </div>
        )
    }

    if (error) return <p className="text-sm text-destructive">Failed to load competitions.</p>

    if (!competitions?.length) return <p className="text-sm text-muted-foreground">No competitions yet.</p>

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {competitions.map((c) => (
                <CompetitionCard key={c.id} competition={c} />
            ))}
        </div>
    )
}

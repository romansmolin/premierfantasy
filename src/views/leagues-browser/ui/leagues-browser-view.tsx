'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { useLeaguesBrowser, type LeagueBrowserItem, type LeagueState } from '@/entities/league'

import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'

const STATE_BADGE: Record<LeagueState, { label: string; className: string }> = {
    LIVE: {
        label: 'Live',
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    },
    SOON: {
        label: 'Soon',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    },
    OFF_SEASON: {
        label: 'Off-season',
        className: 'bg-muted text-muted-foreground',
    },
}

const TYPE_GROUPS = [
    { id: 'League', label: 'Leagues' },
    { id: 'Cup', label: 'Continental Cups' },
    { id: 'Tournament', label: 'International Tournaments' },
] as const

type TypeFilter = 'ALL' | 'League' | 'Cup' | 'Tournament'
type StateFilter = 'ALL' | LeagueState

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const formatDays = (days: number) => {
    if (days === 0) return 'today'

    if (days === 1) return 'tomorrow'

    return `in ${days} days`
}

export const LeaguesBrowserView = () => {
    const { leagues, isLoading, error } = useLeaguesBrowser()
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
    const [stateFilter, setStateFilter] = useState<StateFilter>('ALL')

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase()

        return leagues.filter((item) => {
            if (typeFilter !== 'ALL' && item.league.type !== typeFilter) return false

            if (stateFilter !== 'ALL' && item.state !== stateFilter) return false

            if (!term) return true

            return (
                item.league.name.toLowerCase().includes(term) ||
                item.league.country.toLowerCase().includes(term)
            )
        })
    }, [leagues, search, typeFilter, stateFilter])

    const grouped = useMemo(() => {
        const map = new Map<string, LeagueBrowserItem[]>()

        for (const group of TYPE_GROUPS) map.set(group.id, [])

        for (const item of filtered) {
            const list = map.get(item.league.type) ?? []

            list.push(item)
            map.set(item.league.type, list)
        }

        return map
    }, [filtered])

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-sm text-destructive">
                Failed to load leagues. Try refreshing the page.
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">Choose a League</h1>
                <p className="text-sm text-muted-foreground">
                    Pick any league or championship — you can join an active competition right now or reserve
                    your spot for the next one.
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by league or country…"
                    className="sm:max-w-xs"
                />
                <div className="flex flex-wrap gap-2">
                    {(['ALL', 'League', 'Cup', 'Tournament'] as const).map((type) => (
                        <Button
                            key={type}
                            variant={typeFilter === type ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTypeFilter(type)}
                        >
                            {type === 'ALL'
                                ? 'All'
                                : type === 'League'
                                  ? 'Leagues'
                                  : type === 'Cup'
                                    ? 'Cups'
                                    : 'Tournaments'}
                        </Button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    {(['ALL', 'LIVE', 'SOON', 'OFF_SEASON'] as const).map((state) => (
                        <Button
                            key={state}
                            variant={stateFilter === state ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStateFilter(state)}
                        >
                            {state === 'ALL' ? 'Any state' : STATE_BADGE[state as LeagueState].label}
                        </Button>
                    ))}
                </div>
            </div>

            {isLoading && (
                <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-36 w-full" />
                    ))}
                </div>
            )}

            {!isLoading && filtered.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        No leagues match your filters.
                    </CardContent>
                </Card>
            )}

            {!isLoading &&
                TYPE_GROUPS.map((group) => {
                    const items = grouped.get(group.id) ?? []

                    if (items.length === 0) return null

                    return (
                        <section key={group.id} className="space-y-3">
                            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                {group.label} ({items.length})
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {items.map((item) => (
                                    <LeagueCard key={item.league.id} item={item} />
                                ))}
                            </div>
                        </section>
                    )
                })}
        </div>
    )
}

const LeagueCard = ({ item }: { item: LeagueBrowserItem }) => {
    const stateBadge = STATE_BADGE[item.state]
    const { activeCompetition, nextCompetition, currentSeason } = item

    const [now] = useState(() => Date.now())
    const seasonStartMs = currentSeason ? new Date(currentSeason.startDate).getTime() : null
    const seasonEndMs = currentSeason ? new Date(currentSeason.endDate).getTime() : null
    const isSeasonInProgress =
        seasonStartMs !== null && seasonEndMs !== null && seasonStartMs <= now && seasonEndMs >= now
    const hasSeasonEnded = seasonEndMs !== null && seasonEndMs < now
    const isSeasonUpcoming = seasonStartMs !== null && seasonStartMs > now

    return (
        <Card className="flex flex-col">
            <CardContent className="flex flex-col gap-3 py-5">
                <div className="flex items-start gap-3">
                    {item.league.logo ? (
                        <Image
                            src={item.league.logo}
                            alt={`${item.league.name} logo`}
                            width={40}
                            height={40}
                            className="size-10 shrink-0 rounded object-contain bg-white"
                            unoptimized
                        />
                    ) : (
                        <div className="size-10 shrink-0 rounded bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-semibold truncate">{item.league.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {item.league.country}
                                </p>
                            </div>
                            <Badge className={cn('shrink-0', stateBadge.className)}>{stateBadge.label}</Badge>
                        </div>
                    </div>
                </div>

                <div className="space-y-1 text-sm">
                    {activeCompetition && (
                        <p>
                            <span className="text-muted-foreground">Now: </span>
                            <span className="font-medium">{activeCompetition.name}</span>
                            <span className="text-muted-foreground">
                                {' '}
                                · GW{activeCompetition.startGameweek}–{activeCompetition.endGameweek}
                            </span>
                        </p>
                    )}
                    {nextCompetition && (
                        <p className="text-muted-foreground">
                            Next: {nextCompetition.name} · starts {formatDays(nextCompetition.daysUntilStart)}
                        </p>
                    )}
                    {!activeCompetition && !nextCompetition && currentSeason && isSeasonInProgress && (
                        <p className="text-muted-foreground">
                            Season {currentSeason.year} in progress · ends {formatDate(currentSeason.endDate)}
                        </p>
                    )}
                    {!activeCompetition && !nextCompetition && currentSeason && isSeasonUpcoming && (
                        <p className="text-muted-foreground">
                            Season {currentSeason.year} starts {formatDate(currentSeason.startDate)}
                        </p>
                    )}
                    {!activeCompetition && !nextCompetition && currentSeason && hasSeasonEnded && (
                        <p className="text-muted-foreground">
                            Season {currentSeason.year} ended {formatDate(currentSeason.endDate)} · next
                            season TBD
                        </p>
                    )}
                    {!activeCompetition && !nextCompetition && !currentSeason && (
                        <p className="text-muted-foreground">No upcoming season scheduled yet</p>
                    )}
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    {activeCompetition ? (
                        <Link
                            href={`/competitions/${activeCompetition.id}`}
                            className={buttonVariants({ size: 'sm' })}
                        >
                            Join active competition
                        </Link>
                    ) : (
                        <Button size="sm" disabled>
                            {nextCompetition
                                ? `Opens ${formatDays(nextCompetition.daysUntilStart)}`
                                : isSeasonInProgress
                                  ? 'Joining opens soon'
                                  : isSeasonUpcoming && currentSeason
                                    ? `Season starts ${formatDate(currentSeason.startDate)}`
                                    : hasSeasonEnded
                                      ? 'Next season TBD'
                                      : 'Coming soon'}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

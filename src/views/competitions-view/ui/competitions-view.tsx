'use client'

import { ChampionIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import useSWR from 'swr'

import { competitionService, type ICompetitionBrowserRow } from '@/entities/competition'

import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    active: {
        label: 'Active',
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    },
    upcoming: {
        label: 'Upcoming',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    },
    completed: {
        label: 'Completed',
        className: 'bg-muted text-muted-foreground',
    },
}

const TYPE_GROUPS = [
    { id: 'League', label: 'Leagues' },
    { id: 'Cup', label: 'Continental Cups' },
    { id: 'Tournament', label: 'International Tournaments' },
    { id: '_NO_LEAGUE', label: 'Other' },
] as const

type TypeFilter = 'ALL' | 'League' | 'Cup' | 'Tournament'
type StatusFilter = 'ALL' | 'active' | 'upcoming' | 'completed'

const formatDeadline = (iso: string | null, nowMs: number) => {
    if (!iso) return null

    const d = new Date(iso)
    const ms = d.getTime() - nowMs

    if (ms <= 0) return 'closed'

    const days = Math.ceil(ms / (24 * 60 * 60 * 1000))

    if (days <= 1) return 'today'

    if (days <= 14) return `in ${days} days`

    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export const CompetitionsView = () => {
    const { data, error, isLoading } = useSWR<ICompetitionBrowserRow[]>(
        ['competitions', 'browser'],
        () => competitionService.getBrowser(),
        { revalidateOnFocus: false, dedupingInterval: 60 * 1000 },
    )

    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
    const [nowMs] = useState(() => Date.now())

    const competitions = useMemo(() => data ?? [], [data])

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase()

        return competitions.filter((c) => {
            if (typeFilter !== 'ALL' && c.league?.type !== typeFilter) return false

            if (statusFilter !== 'ALL' && c.status !== statusFilter) return false

            if (!term) return true

            return (
                c.name.toLowerCase().includes(term) ||
                (c.league?.name.toLowerCase().includes(term) ?? false) ||
                (c.league?.country.toLowerCase().includes(term) ?? false)
            )
        })
    }, [competitions, search, typeFilter, statusFilter])

    const grouped = useMemo(() => {
        const map = new Map<string, ICompetitionBrowserRow[]>()

        for (const group of TYPE_GROUPS) map.set(group.id, [])

        for (const c of filtered) {
            const key = c.league?.type ?? '_NO_LEAGUE'
            const list = map.get(key) ?? []

            list.push(c)
            map.set(key, list)
        }

        return map
    }, [filtered])

    const counts = useMemo(() => {
        return {
            all: competitions.length,
            active: competitions.filter((c) => c.status === 'active').length,
            upcoming: competitions.filter((c) => c.status === 'upcoming').length,
            completed: competitions.filter((c) => c.status === 'completed').length,
        }
    }, [competitions])

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-sm text-destructive">
                Failed to load competitions. Try refreshing the page.
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">Competitions</h1>
                <p className="text-sm text-muted-foreground">
                    Browse every competition across {competitions.length} leagues and championships. Pick one
                    to join, or check out{' '}
                    <Link href="/leagues" className="underline underline-offset-2 hover:text-foreground">
                        the league overview
                    </Link>
                    .
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by competition, league, or country…"
                    className="sm:max-w-xs"
                />
                <div className="flex flex-wrap gap-2">
                    {(
                        [
                            { id: 'ALL', label: `All (${counts.all})` },
                            { id: 'active', label: `Active (${counts.active})` },
                            { id: 'upcoming', label: `Upcoming (${counts.upcoming})` },
                            { id: 'completed', label: `Completed (${counts.completed})` },
                        ] as const
                    ).map((opt) => (
                        <Button
                            key={opt.id}
                            variant={statusFilter === opt.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(opt.id as StatusFilter)}
                        >
                            {opt.label}
                        </Button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    {(['ALL', 'League', 'Cup', 'Tournament'] as const).map((type) => (
                        <Button
                            key={type}
                            variant={typeFilter === type ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTypeFilter(type)}
                        >
                            {type === 'ALL'
                                ? 'All types'
                                : type === 'League'
                                  ? 'Leagues'
                                  : type === 'Cup'
                                    ? 'Cups'
                                    : 'Tournaments'}
                        </Button>
                    ))}
                </div>
            </div>

            {isLoading && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-40 w-full" />
                    ))}
                </div>
            )}

            {!isLoading && filtered.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="py-10 text-center space-y-3">
                        <p className="text-sm text-muted-foreground">No competitions match your filters.</p>
                        <Link href="/leagues" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                            Browse leagues instead
                        </Link>
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
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {items.map((c) => (
                                    <CompetitionCard key={c.id} competition={c} nowMs={nowMs} />
                                ))}
                            </div>
                        </section>
                    )
                })}
        </div>
    )
}

const CompetitionCard = ({ competition, nowMs }: { competition: ICompetitionBrowserRow; nowMs: number }) => {
    const status = STATUS_BADGE[competition.status] ?? STATUS_BADGE.upcoming
    const deadline = formatDeadline(competition.joinDeadline, nowMs)
    const isJoinable = competition.status === 'active' || competition.status === 'upcoming'

    return (
        <Card className="flex flex-col">
            <CardContent className="flex flex-col gap-3 py-5">
                <div className="flex items-start gap-3">
                    {competition.league?.logo ? (
                        <Image
                            src={competition.league.logo}
                            alt={`${competition.league.name} logo`}
                            width={36}
                            height={36}
                            className="size-9 shrink-0 rounded object-contain bg-white"
                            unoptimized
                        />
                    ) : (
                        <div className="size-9 shrink-0 rounded bg-muted flex items-center justify-center">
                            <HugeiconsIcon icon={ChampionIcon} size={16} className="text-muted-foreground" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-semibold truncate" title={competition.name}>
                                    {competition.name}
                                </p>
                                {competition.league && (
                                    <p className="text-xs text-muted-foreground truncate">
                                        {competition.league.name} · {competition.league.country}
                                    </p>
                                )}
                            </div>
                            <Badge className={cn('shrink-0', status.className)}>{status.label}</Badge>
                        </div>
                    </div>
                </div>

                <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                        Gameweeks{' '}
                        <span className="font-medium text-foreground">
                            {competition.startGameweek}–{competition.endGameweek}
                        </span>
                    </p>
                    {deadline && competition.status !== 'completed' && (
                        <p className="text-muted-foreground">
                            {competition.status === 'active' ? 'Joins close' : 'Opens'}{' '}
                            <span className="font-medium text-foreground">{deadline}</span>
                        </p>
                    )}
                </div>

                <div className="mt-auto pt-2">
                    <Link
                        href={`/competitions/${competition.id}`}
                        className={buttonVariants({
                            size: 'sm',
                            variant: isJoinable ? 'default' : 'outline',
                            className: 'w-full',
                        })}
                    >
                        {competition.status === 'active'
                            ? 'View & Join'
                            : competition.status === 'upcoming'
                              ? 'Reserve spot'
                              : 'View results'}
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}

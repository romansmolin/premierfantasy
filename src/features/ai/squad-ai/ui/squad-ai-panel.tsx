'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import { AI_FEATURE_PRICES } from '@/entities/ai'
import { squadService } from '@/entities/squad'
import type { AutoBuildResult, PoolPlayer, SquadReview } from '@/entities/squad'
import { useWallet } from '@/entities/wallet'

import { ApiError } from '@/shared/api/api-error'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

interface SquadAiPanelProps {
    players: Map<string, PoolPlayer>
    lockedIds: string[]
    excludedIds: string[]
    onUnlock: (id: string) => void
    onInclude: (id: string) => void
    /** Put an auto-built squad into the builder; the user still decides whether to save it. */
    onApply: (result: AutoBuildResult) => void
    /** The saved squad that "AI review" reads; null while the current squad is unsaved. */
    savedSquadId: string | null
    forecastEnabled: boolean
}

const failure = (error: unknown, cost: number) => {
    if (ApiError.isApiError(error) && error.status === 402) {
        return `Not enough credits: you need ${cost}.`
    }

    return error instanceof Error ? error.message : 'Something went wrong'
}

export function SquadAiPanel(props: SquadAiPanelProps) {
    const { players, lockedIds, excludedIds, savedSquadId, forecastEnabled } = props
    const { mutate: reloadWallet } = useWallet()
    const [building, setBuilding] = useState(false)
    const [reviewing, setReviewing] = useState(false)
    const [built, setBuilt] = useState<AutoBuildResult | null>(null)
    const [review, setReview] = useState<SquadReview | null>(null)
    const [reviewedSquad, setReviewedSquad] = useState(savedSquadId)

    // A review belongs to one saved squad; the auto-build result stays when the squad is saved or edited.
    if (reviewedSquad !== savedSquadId) {
        setReviewedSquad(savedSquadId)
        setReview(null)
    }

    const name = (id: string) => players.get(id)?.name ?? id

    const runBuild = async (refresh: boolean) => {
        const cost = AI_FEATURE_PRICES.AUTO_BUILD

        // The most expensive click on the site: always a deliberate second step.
        const label = refresh ? 'Recomputing with the current forecast' : 'Auto-build'

        if (
            !window.confirm(
                `${label} costs ${cost} Credits (free if you already have this result for the gameweek). Go ahead?`,
            )
        )
            return

        setBuilding(true)

        try {
            const result = await squadService.autoBuild({ lockedIds, excludedIds, refresh })

            setBuilt(result)
            props.onApply(result)
        } catch (error) {
            toast.error(failure(error, cost))
        } finally {
            setBuilding(false)
            await reloadWallet()
        }
    }

    const runReview = async (refresh: boolean) => {
        if (!savedSquadId) return

        const cost = AI_FEATURE_PRICES.SQUAD_REVIEW

        setReviewing(true)

        try {
            setReview(await squadService.review(savedSquadId, refresh))
        } catch (error) {
            toast.error(failure(error, cost))
        } finally {
            setReviewing(false)
            await reloadWallet()
        }
    }

    const chip = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs'

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI tools</CardTitle>
                <CardDescription>
                    Paid with Credits. The same request twice in a gameweek is paid once.{' '}
                    <Link
                        href="/wallet"
                        className="font-medium whitespace-nowrap text-foreground underline underline-offset-4"
                    >
                        Get Credits
                    </Link>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                {!forecastEnabled && (
                    <p className="rounded-lg border border-dashed px-3 py-2 text-muted-foreground">
                        Both tools are off until the forecast beats the baseline.
                    </p>
                )}

                <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
                    <div>
                        <h3 className="font-semibold">Auto-build</h3>
                        <p className="mt-1 text-muted-foreground">
                            Builds the best legal squad for the next gameweek.
                        </p>
                    </div>
                    {lockedIds.length + excludedIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {lockedIds.map((id) => (
                                <span key={id} className={`${chip} bg-secondary`}>
                                    locked: {name(id)}
                                    <button
                                        type="button"
                                        className="text-muted-foreground hover:text-foreground"
                                        onClick={() => props.onUnlock(id)}
                                        aria-label={`Unlock ${name(id)}`}
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                            {excludedIds.map((id) => (
                                <span key={id} className={chip}>
                                    excluded: {name(id)}
                                    <button
                                        type="button"
                                        className="text-muted-foreground hover:text-foreground"
                                        onClick={() => props.onInclude(id)}
                                        aria-label={`Include ${name(id)}`}
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Keep a player from the menu of their card, or rule one out with Exclude in the
                            player list.
                        </p>
                    )}
                    <Button
                        className="w-full"
                        onClick={() => runBuild(false)}
                        disabled={building || !forecastEnabled}
                    >
                        {building ? 'Building...' : `Auto-build (${AI_FEATURE_PRICES.AUTO_BUILD} Credits)`}
                    </Button>
                    {built && (
                        <div className="space-y-3 border-t pt-3">
                            <dl className="grid grid-cols-3 gap-2">
                                <div>
                                    <dt className="text-xs text-muted-foreground">Gameweek</dt>
                                    <dd className="font-semibold">{built.event}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">Cost</dt>
                                    <dd className="font-semibold">£{(built.totalTenths / 10).toFixed(1)}m</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">Expected XI points</dt>
                                    <dd className="font-audiowide">{built.expectedXi.toFixed(1)}</dd>
                                </div>
                            </dl>
                            <p className="text-xs text-muted-foreground">
                                Loaded into the builder. Save it if you like it.
                            </p>
                            {built.explanation && <p>{built.explanation}</p>}
                            {built.forecastUpdated && (
                                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2">
                                    <span className="text-xs">
                                        The forecast was updated after this squad was built.
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={building}
                                        onClick={() => runBuild(true)}
                                    >
                                        Recompute ({AI_FEATURE_PRICES.AUTO_BUILD} Credits)
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
                    <div>
                        <h3 className="font-semibold">AI squad review</h3>
                        <p className="mt-1 text-muted-foreground">
                            Strengths, risks and swap ideas for the saved version of your squad.
                        </p>
                    </div>
                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => runReview(false)}
                        disabled={reviewing || !savedSquadId || !forecastEnabled}
                    >
                        {reviewing ? 'Reviewing...' : `AI review (${AI_FEATURE_PRICES.SQUAD_REVIEW} Credits)`}
                    </Button>
                    {!savedSquadId && (
                        <p className="text-xs text-muted-foreground">Save the squad to enable the review.</p>
                    )}
                    {review && (
                        <div className="space-y-3 border-t pt-3">
                            <p>{review.summary}</p>
                            {review.strengths.length > 0 && (
                                <div>
                                    <h4 className="font-medium">Strengths</h4>
                                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                                        {review.strengths.map((s) => (
                                            <li key={s}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {review.risks.length > 0 && (
                                <div>
                                    <h4 className="font-medium">Risks</h4>
                                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                                        {review.risks.map((s) => (
                                            <li key={s}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {review.suggestions.length > 0 && (
                                <div>
                                    <h4 className="font-medium">Suggested swaps</h4>
                                    <ul className="mt-1 space-y-1 text-muted-foreground">
                                        {review.suggestions.map((s) => (
                                            <li key={`${s.out}-${s.in}`}>
                                                <span className="font-medium text-foreground">
                                                    {name(s.out)} → {name(s.in)}
                                                </span>
                                                : {s.reason}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {review.forecastUpdated && (
                                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2">
                                    <span className="text-xs">
                                        The forecast was updated after this review.
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={reviewing}
                                        onClick={() => runReview(true)}
                                    >
                                        Review again ({AI_FEATURE_PRICES.SQUAD_REVIEW} Credits)
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </CardContent>
        </Card>
    )
}

'use client'

import Link from 'next/link'

import { useSession } from '@/shared/lib/auth-client'
import { Button } from '@/shared/ui/button'

import { usePlayerAnalytics } from '../model/use-player-analytics'

import { PlayerAnalyticsModal } from './player-analytics-modal'

/** AI analysis for one player; signed-out visitors are sent to sign in. */
export function PlayerAiAnalysis({ playerExternalId }: { playerExternalId: number }) {
    const { data: session } = useSession()
    const analytics = usePlayerAnalytics(playerExternalId)

    if (!session) {
        return (
            <p className="text-sm text-muted-foreground">
                <Link href="/sign-in" className="underline underline-offset-4">
                    Sign in
                </Link>{' '}
                to get an AI analysis of this player ({analytics.cost} Credits).
            </p>
        )
    }

    return (
        <>
            <Button onClick={analytics.requestAnalysis} disabled={analytics.isLoading}>
                {analytics.isLoading ? 'Analyzing...' : `AI analysis (${analytics.cost} Credits)`}
            </Button>
            <PlayerAnalyticsModal
                open={analytics.isOpen}
                onClose={analytics.closeModal}
                analysis={analytics.analysis}
                isLoading={analytics.isLoading}
            />
        </>
    )
}

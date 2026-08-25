'use client'

import { useEffect, useState } from 'react'

interface JoinCountdownProps {
    deadline: string
    /** Rendered once the deadline has passed. */
    expiredLabel?: string
}

const URGENT_MS = 24 * 3_600_000

interface Remaining {
    text: string
    isUrgent: boolean
}

const measure = (deadline: string): Remaining | null => {
    const diff = new Date(deadline).getTime() - Date.now()

    if (diff <= 0) return null

    const days = Math.floor(diff / 86_400_000)
    const hours = Math.floor((diff / 3_600_000) % 24)
    const minutes = Math.floor((diff / 60_000) % 60)
    const seconds = Math.floor((diff / 1000) % 60)

    const text =
        days > 0
            ? `${days}d ${hours}h`
            : hours > 0
              ? `${hours}h ${String(minutes).padStart(2, '0')}m`
              : `${minutes}m ${String(seconds).padStart(2, '0')}s`

    return { text, isUrgent: diff < URGENT_MS }
}

/**
 * One-line ticking countdown for a league card. Ticks every second only inside
 * the final hour — a list of cards should not re-render every second for days on end.
 */
export const JoinCountdown = ({ deadline, expiredLabel = 'closed' }: JoinCountdownProps) => {
    // undefined = not measured yet (first paint), null = deadline already passed.
    const [remaining, setRemaining] = useState<Remaining | null | undefined>(undefined)

    useEffect(() => {
        const update = () => setRemaining(measure(deadline))

        update()

        const msLeft = new Date(deadline).getTime() - Date.now()
        const interval = setInterval(update, msLeft < 3_600_000 ? 1000 : 60_000)

        return () => clearInterval(interval)
    }, [deadline])

    if (remaining === undefined) {
        return <span className="font-medium tabular-nums text-muted-foreground">&mdash;</span>
    }

    if (remaining === null) {
        return <span className="font-medium text-muted-foreground">{expiredLabel}</span>
    }

    return (
        <span
            className={
                remaining.isUrgent
                    ? 'font-medium tabular-nums text-amber-600 dark:text-amber-400'
                    : 'font-medium tabular-nums'
            }
        >
            {remaining.text}
        </span>
    )
}

'use client'

import { Clock01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useEffect, useState } from 'react'

interface CountdownTimerProps {
    deadline: Date
    label?: string
    nextDeadline?: Date | null
    nextLabel?: string
}

function calcTimeLeft(
    deadline: Date,
): { days: number; hours: number; minutes: number; seconds: number } | null {
    const diff = deadline.getTime() - Date.now()

    if (diff <= 0) return null

    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
    }
}

const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
        <span className="text-2xl font-bold tabular-nums">{String(value).padStart(2, '0')}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
)

export const CountdownTimer = ({
    deadline,
    label = 'Time left to join',
    nextDeadline,
    nextLabel = 'Next transfer window opens in',
}: CountdownTimerProps) => {
    const [timeLeft, setTimeLeft] = useState(calcTimeLeft(deadline))
    const [nextTimeLeft, setNextTimeLeft] = useState(nextDeadline ? calcTimeLeft(nextDeadline) : null)

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(calcTimeLeft(deadline))

            if (nextDeadline) {
                setNextTimeLeft(calcTimeLeft(nextDeadline))
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [deadline, nextDeadline])

    // Current deadline passed — show countdown to next deadline
    const activeTimeLeft = timeLeft ?? nextTimeLeft
    const activeLabel = timeLeft ? label : nextLabel
    const isPast = !timeLeft

    if (!activeTimeLeft) return null

    const isUrgent = !isPast && activeTimeLeft.days === 0 && activeTimeLeft.hours < 6

    return (
        <div
            className={`rounded-xl border px-5 py-4 ${isUrgent ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20' : 'border-border'}`}
        >
            <div className="flex items-center gap-2 mb-3">
                <HugeiconsIcon
                    icon={Clock01Icon}
                    size={16}
                    className={isUrgent ? 'text-amber-600' : 'text-muted-foreground'}
                />
                <span
                    className={`text-xs font-semibold uppercase tracking-wider ${isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}
                >
                    {activeLabel}
                </span>
            </div>
            <div className="flex items-center justify-center gap-4">
                {activeTimeLeft.days > 0 && (
                    <>
                        <TimeBlock value={activeTimeLeft.days} label="Days" />
                        <span className="text-xl font-light text-muted-foreground">:</span>
                    </>
                )}
                <TimeBlock value={activeTimeLeft.hours} label="Hours" />
                <span className="text-xl font-light text-muted-foreground">:</span>
                <TimeBlock value={activeTimeLeft.minutes} label="Min" />
                <span className="text-xl font-light text-muted-foreground">:</span>
                <TimeBlock value={activeTimeLeft.seconds} label="Sec" />
            </div>
        </div>
    )
}

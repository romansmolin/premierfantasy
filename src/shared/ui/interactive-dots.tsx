'use client'

import { useMotionValue, motion, useMotionTemplate } from 'framer-motion'
import { useEffect } from 'react'

import { cn } from '@/shared/lib/utils'

interface InteractiveDotsProps {
    children: React.ReactNode
    className?: string
}

const dotPattern = (color: string) => ({
    backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1px)`,
    backgroundSize: '16px 16px',
})

export function InteractiveDots({ children, className }: InteractiveDotsProps) {
    const mouseX = useMotionValue(-1000)
    const mouseY = useMotionValue(-1000)

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            mouseX.set(e.clientX)
            mouseY.set(e.clientY)
        }

        const handleLeave = () => {
            mouseX.set(-1000)
            mouseY.set(-1000)
        }

        window.addEventListener('mousemove', handleMove)
        document.addEventListener('mouseleave', handleLeave)

        return () => {
            window.removeEventListener('mousemove', handleMove)
            document.removeEventListener('mouseleave', handleLeave)
        }
    }, [mouseX, mouseY])

    return (
        <div className={cn('relative w-full', className)}>
            {/* Light mode static dots */}
            <div
                className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-0 z-0"
                style={dotPattern('rgb(212 212 212)')}
            />
            {/* Dark mode static dots */}
            <div
                className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-50 z-0"
                style={dotPattern('rgb(38 38 38)')}
            />
            {/* Mouse-following amber highlight — fixed to viewport */}
            <motion.div
                className="pointer-events-none fixed inset-0 z-0"
                style={{
                    ...dotPattern('rgb(245 158 11)'),
                    WebkitMaskImage: useMotionTemplate`
                        radial-gradient(
                            300px circle at ${mouseX}px ${mouseY}px,
                            black 0%,
                            transparent 100%
                        )
                    `,
                    maskImage: useMotionTemplate`
                        radial-gradient(
                            300px circle at ${mouseX}px ${mouseY}px,
                            black 0%,
                            transparent 100%
                        )
                    `,
                }}
            />
            <div className="relative z-10">{children}</div>
        </div>
    )
}

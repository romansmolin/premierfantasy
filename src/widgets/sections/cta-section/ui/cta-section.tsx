'use client'

import { Login01Icon, StartUp01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'

import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'
import { HeroHighlight, Highlight } from '@/shared/ui/hero-highlight'

export function CtaSection() {
    return (
        <HeroHighlight>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: [20, -5, 0] }}
                transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
                className="text-center space-y-6"
            >
                <h2 className="font-heading text-2xl px-4 md:text-4xl lg:text-5xl font-bold text-foreground max-w-4xl leading-relaxed lg:leading-snug mx-auto">
                    Plan your next fantasy squad with
                    <br />
                    <Highlight className="text-foreground">better data</Highlight>
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                    Explore Premier League stats for free and use AI insights with Credits. No games, no
                    contests, no prizes — just analysis for the fantasy platform you already play.
                </p>
                <div className="flex items-center justify-center gap-3 pt-4">
                    <Link href="/sign-up" className={cn('w-40', buttonVariants({ size: 'lg' }))}>
                        <HugeiconsIcon icon={StartUp01Icon} />
                        Create Free Account
                    </Link>
                    <Link
                        href="/sign-in"
                        className={cn('w-40', buttonVariants({ variant: 'outline', size: 'lg' }))}
                    >
                        <HugeiconsIcon icon={Login01Icon} />
                        Sign In
                    </Link>
                </div>
            </motion.div>
        </HeroHighlight>
    )
}

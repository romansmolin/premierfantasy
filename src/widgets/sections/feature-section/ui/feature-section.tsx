'use client'

import {
    AiBrain01Icon,
    ChartBarIncreasingIcon,
    Clock01Icon,
    Coins01Icon,
    FlashIcon,
    UserSwitchIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { AnimateIn, StaggerChildren, StaggerItem } from '@/shared/ui/animate-in'

const features = [
    {
        icon: FlashIcon,
        title: 'Real-Time Scoring',
        description: 'Points calculated automatically from live Premier League match data via API-Football.',
    },
    {
        icon: ChartBarIncreasingIcon,
        title: 'Rolling Competitions',
        description: 'Fresh 5-gameweek competitions so new players can join anytime without disadvantage.',
    },
    {
        icon: AiBrain01Icon,
        title: 'AI-Powered Insights',
        description:
            'GPT-driven transfer suggestions, player analytics, and match predictions to sharpen your edge.',
    },
    {
        icon: UserSwitchIcon,
        title: 'Smart Transfers',
        description:
            'Swap players between gameweeks with free transfers. Extra swaps cost points — just like FPL.',
    },
    {
        icon: Coins01Icon,
        title: 'Earn & Spend Coins',
        description: 'Top 3 finishers earn coins every round. Spend them on premium AI features or save up.',
    },
    {
        icon: Clock01Icon,
        title: 'Daily Auto-Sync',
        description:
            'Automated pipeline scores gameweeks, transitions competitions, and keeps everything up to date.',
    },
]

export function FeatureSection() {
    return (
        <section className="py-8 md:py-12">
            <div className="mx-auto max-w-5xl space-y-6 px-6 md:space-y-10">
                <AnimateIn variant="fadeUp">
                    <div className="relative z-10 mx-auto max-w-xl space-y-6 text-center md:space-y-12">
                        <h2 className="font-heading text-balance text-4xl font-medium lg:text-5xl">
                            Everything you need to dominate Premier Fantasy
                        </h2>
                        <p className="text-muted-foreground">
                            Built for Premier League fans who want more than just picking a team. Real data,
                            AI analysis, rolling competitions, and a coin economy that rewards skill.
                        </p>
                    </div>
                </AnimateIn>

                <StaggerChildren
                    staggerDelay={0.1}
                    className="relative mx-auto grid max-w-2xl lg:max-w-4xl divide-x divide-y border *:p-12 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {features.map((feature) => (
                        <StaggerItem key={feature.title}>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <HugeiconsIcon icon={feature.icon} size={16} />
                                    <h3 className="text-sm font-medium">{feature.title}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </div>
                        </StaggerItem>
                    ))}
                </StaggerChildren>
            </div>
        </section>
    )
}

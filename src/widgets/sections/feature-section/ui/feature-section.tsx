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
        icon: ChartBarIncreasingIcon,
        title: 'Advanced Player Stats',
        description:
            'Browse clubs and players, filter by position and club, and open a profile with real season statistics from API-Football.',
    },
    {
        icon: Clock01Icon,
        title: 'Fixtures Overview',
        description: 'See the upcoming Premier League fixtures at a glance before you make your picks.',
    },
    {
        icon: AiBrain01Icon,
        title: 'AI Player Analysis',
        description:
            'A GPT-written assessment of a player’s form and fantasy value, built on real data. 10 Credits per analysis.',
    },
    {
        icon: FlashIcon,
        title: 'AI Match Predictions',
        description: 'A predicted score and the fantasy picks to watch for an upcoming match. 10 Credits.',
    },
    {
        icon: Coins01Icon,
        title: 'Credits That Never Expire',
        description:
            'Buy Credits once and use them whenever you like. Re-opening a report you already paid for is free.',
    },
    {
        icon: UserSwitchIcon,
        title: 'Squad Tools (Coming Soon)',
        description:
            'Squad review and auto-build, to suggest a squad within the rules of the fantasy platform you play.',
    },
]

export function FeatureSection() {
    return (
        <section id="features" className="py-8 md:py-12">
            <div className="mx-auto max-w-5xl space-y-6 px-6 md:space-y-10">
                <AnimateIn variant="fadeUp">
                    <div className="relative z-10 mx-auto max-w-xl space-y-6 text-center md:space-y-12">
                        <h2 className="font-heading text-balance text-4xl font-medium lg:text-5xl">
                            Everything you need to prepare your fantasy squad
                        </h2>
                        <p className="text-muted-foreground">
                            Built for fantasy managers who want more than a hunch. Real data and AI analysis,
                            paid for only when you use it.
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

'use client'

import { AiBrain01Icon, ChartBarIncreasingIcon, UserSwitchIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import { cn } from '@/shared/lib/utils'
import { AnimateIn } from '@/shared/ui/animate-in'
import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'

interface TabContent {
    badge: string
    title: string
    description: string
    buttonText: string
    buttonHref: string
    imageSrc: string
    imageAlt: string
}

interface Tab {
    value: string
    icon: typeof AiBrain01Icon
    label: string
    content: TabContent
}

const tabs: Tab[] = [
    {
        value: 'ai',
        icon: AiBrain01Icon,
        label: 'AI Insights',
        content: {
            badge: 'Powered by GPT',
            title: 'AI that gives you the edge.',
            description:
                'Get transfer suggestions, deep player analytics, and match predictions — all powered by real Premier League data and GPT reasoning. Spend coins to unlock insights that help you climb the leaderboard.',
            buttonText: 'Get Started',
            buttonHref: '/sign-up',
            imageSrc: '/assets/aura1.png',
            imageAlt: 'AI analytics dashboard',
        },
    },
    {
        value: 'competitions',
        icon: ChartBarIncreasingIcon,
        label: 'Rolling Competitions',
        content: {
            badge: '5-Gameweek Rounds',
            title: 'Fresh competition every 5 weeks.',
            description:
                'No season-long commitment. Join rolling 5-gameweek competitions at any time. Late to the party? No problem — the next round is always around the corner. Top 3 finishers earn coin rewards.',
            buttonText: 'View Competitions',
            buttonHref: '/sign-up',
            imageSrc: '/assets/holand.png',
            imageAlt: 'Football competition leaderboard',
        },
    },
    {
        value: 'transfers',
        icon: UserSwitchIcon,
        label: 'Smart Transfers',
        content: {
            badge: 'FPL-Style System',
            title: 'Swap players between gameweeks.',
            description:
                'Get free transfers every round. Use the transfer modal to swap underperformers for in-form players. Pair it with AI suggestions to make data-driven decisions that maximize your points.',
            buttonText: 'Start Building',
            buttonHref: '/sign-up',
            imageSrc: '/assets/player.png',
            imageAlt: 'Football player transfer',
        },
    },
]

export function FeatureTabsSection() {
    const [activeTab, setActiveTab] = useState(tabs[0].value)

    const activeContent = tabs.find((t) => t.value === activeTab)?.content

    return (
        <section className="py-10 md:py-16">
            <div className="mx-auto max-w-5xl px-6">
                <AnimateIn variant="fadeUp">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <Badge variant="outline">Platform Highlights</Badge>
                        <h2 className="font-heading max-w-2xl text-3xl font-semibold md:text-4xl">
                            Built for serious fantasy managers
                        </h2>
                        <p className="text-muted-foreground max-w-lg">
                            Real data, AI analysis, and a fair competition system that rewards skill over
                            luck.
                        </p>
                    </div>
                </AnimateIn>

                {/* Tab triggers */}
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row md:gap-10">
                    {tabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={cn(
                                'flex items-center gap-2 rounded-xl w-60 justify-center px-4 py-3 text-sm font-semibold transition-colors',
                                activeTab === tab.value
                                    ? 'bg-muted text-primary'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <HugeiconsIcon icon={tab.icon} size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {activeContent && (
                    <AnimateIn variant="fadeIn" delay={0.2}>
                        <div className="mx-auto mt-8 max-w-screen-xl rounded-2xl bg-muted/70 p-6 lg:p-16">
                            <div className="grid place-items-center gap-10 lg:grid-cols-2">
                                <div className="flex flex-col gap-5">
                                    <Badge variant="outline" className="w-fit bg-background">
                                        {activeContent.badge}
                                    </Badge>
                                    <h3 className="font-heading text-3xl font-semibold lg:text-5xl">
                                        {activeContent.title}
                                    </h3>
                                    <p className="text-muted-foreground lg:text-lg">
                                        {activeContent.description}
                                    </p>
                                    <Link
                                        href={activeContent.buttonHref}
                                        className={cn('mt-2.5 w-fit', buttonVariants({ size: 'lg' }))}
                                    >
                                        {activeContent.buttonText}
                                    </Link>
                                </div>
                                <Image
                                    src={activeContent.imageSrc}
                                    alt={activeContent.imageAlt}
                                    width={600}
                                    height={400}
                                    className="rounded-xl object-cover"
                                />
                            </div>
                        </div>
                    </AnimateIn>
                )}
            </div>
        </section>
    )
}

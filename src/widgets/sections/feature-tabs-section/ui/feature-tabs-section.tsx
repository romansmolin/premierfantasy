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
            title: 'AI that explains the numbers.',
            description:
                'Get an in-depth analysis of any player or a prediction for an upcoming match, built on real Premier League data. Each request costs Credits, and re-opening a report you already paid for is free.',
            buttonText: 'Get Started',
            buttonHref: '/sign-up',
            imageSrc: '/assets/aura1.png',
            imageAlt: 'AI analytics dashboard',
        },
    },
    {
        value: 'stats',
        icon: ChartBarIncreasingIcon,
        label: 'Player Stats',
        content: {
            badge: 'Real match data',
            title: 'Stats, without the spreadsheet.',
            description:
                'Browse clubs and players, filter by position and club, and open a player profile with season statistics. Free for every account.',
            buttonText: 'Explore Players',
            buttonHref: '/sign-up',
            imageSrc: '/assets/holand.png',
            imageAlt: 'Football player statistics',
        },
    },
    {
        value: 'squad',
        icon: UserSwitchIcon,
        label: 'Squad Tools',
        content: {
            badge: 'Coming soon',
            title: 'Plan your squad with confidence.',
            description:
                'We are building squad review and auto-build tools that suggest a squad within the rules of the fantasy platform you play. You always enter the squad yourself on that platform.',
            buttonText: 'Create Free Account',
            buttonHref: '/sign-up',
            imageSrc: '/assets/player.png',
            imageAlt: 'Football player',
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
                            Real data and AI analysis to help you make better fantasy decisions.
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

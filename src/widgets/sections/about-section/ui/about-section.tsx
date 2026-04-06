'use client'

import Image from 'next/image'
import Link from 'next/link'

import { cn } from '@/shared/lib/utils'
import { AnimateIn } from '@/shared/ui/animate-in'
import { buttonVariants } from '@/shared/ui/button'

const achievements = [
    { label: 'Active Managers', value: '1,000+' },
    { label: 'Competitions Completed', value: '200+' },
    { label: 'AI Analyses Run', value: '5,000+' },
    { label: 'Coins Awarded', value: '500K+' },
]

const contentSections = [
    {
        title: 'Our Vision',
        content:
            'Fantasy football has always been about passion, strategy, and bragging rights. But most platforms lock you into a full-season commitment — punishing late joiners and rewarding those who got lucky in August.\n\nWe built this platform to change that. With rolling 5-gameweek competitions, anyone can jump in at any time and compete on equal footing. Add AI-powered insights and a coin economy, and you have a fantasy experience that rewards skill, not just luck.\n\nWe believe every Premier League fan deserves a shot at the top of the leaderboard.',
    },
    {
        title: 'How We Built It',
        content:
            'Our platform is powered by real-time data from API-Football, covering every Premier League fixture, player stat, and match event. Scoring is calculated automatically using FPL-style rules.\n\nThe AI features use GPT to analyze squad composition, player form, and upcoming fixtures — giving you transfer suggestions and match predictions backed by data, not guesswork.\n\nEverything runs on a daily automated pipeline: gameweeks sync, scores calculate, competitions transition, and rewards distribute — all without manual intervention.',
    },
]

export function AboutSection() {
    return (
        <section className="py-10 md:py-16">
            <div className="mx-auto max-w-6xl px-6">
                {/* Header */}
                <AnimateIn variant="fadeUp">
                    <div className="mb-14 flex flex-col gap-5 lg:w-2/3">
                        <h1 className="font-heading text-4xl font-semibold tracking-tighter lg:text-5xl">
                            About Us
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            We&apos;re building the fairest, smartest fantasy football platform for Premier
                            League fans. Rolling competitions, real data, and AI analysis — all in one place.
                        </p>
                    </div>
                </AnimateIn>

                {/* Image Grid */}
                <AnimateIn variant="scaleUp" delay={0.2}>
                    <div className="grid gap-7 lg:grid-cols-3">
                        <Image
                            src="/assets/aura.png"
                            alt="Premier Fantasy"
                            width={800}
                            height={620}
                            className="size-full max-h-155 rounded-xl object-cover lg:col-span-2"
                        />
                        <div className="flex flex-col gap-7 md:flex-row lg:flex-col">
                            <div className="flex flex-col justify-between gap-6 rounded-xl bg-muted p-7 md:w-1/2 lg:w-auto">
                                <div>
                                    <p className="mb-2 text-lg font-semibold">Powered by Real Data</p>
                                    <p className="text-sm text-muted-foreground">
                                        Every score, every stat, every prediction — driven by live Premier
                                        League data from API-Football and analyzed by GPT.
                                    </p>
                                </div>
                                <Link
                                    href="/sign-up"
                                    className={cn('mr-auto', buttonVariants({ variant: 'outline' }))}
                                >
                                    Get Started
                                </Link>
                            </div>
                            <Image
                                src="/assets/holand.png"
                                alt="Football player"
                                width={400}
                                height={300}
                                className="grow basis-0 rounded-xl object-cover md:w-1/2 lg:min-h-0 lg:w-auto"
                            />
                        </div>
                    </div>
                </AnimateIn>

                {/* Achievements */}
                <AnimateIn variant="fadeUp" delay={0.1}>
                    <div className="relative mt-16 overflow-hidden rounded-xl bg-muted p-7 md:p-16">
                        <div className="flex flex-col gap-4 text-center md:text-left">
                            <h2 className="font-heading text-3xl font-medium md:text-4xl">
                                Platform in Numbers
                            </h2>
                            <p className="max-w-xl text-muted-foreground">
                                Growing every gameweek as more managers discover a fairer way to play fantasy
                                football.
                            </p>
                        </div>
                        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 md:flex md:flex-wrap md:justify-between">
                            {achievements.map((item) => (
                                <div
                                    className="flex flex-col gap-2 text-center md:text-left"
                                    key={item.label}
                                >
                                    <span className="font-heading text-4xl font-semibold md:text-5xl">
                                        {item.value}
                                    </span>
                                    <p className="text-sm md:text-base">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimateIn>

                {/* Content Sections */}
                <AnimateIn variant="fadeUp">
                    <div className="mx-auto grid max-w-5xl gap-16 py-16 md:grid-cols-2 md:gap-20">
                        {contentSections.map((section) => (
                            <div key={section.title}>
                                <h2 className="font-heading mb-5 text-3xl font-medium">{section.title}</h2>
                                <p className="text-base leading-7 whitespace-pre-line text-muted-foreground">
                                    {section.content}
                                </p>
                            </div>
                        ))}
                    </div>
                </AnimateIn>
            </div>
        </section>
    )
}

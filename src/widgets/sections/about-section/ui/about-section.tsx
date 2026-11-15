'use client'

import Image from 'next/image'
import Link from 'next/link'

import { cn } from '@/shared/lib/utils'
import { AnimateIn } from '@/shared/ui/animate-in'
import { buttonVariants } from '@/shared/ui/button'

const contentSections = [
    {
        title: 'Our Vision',
        content:
            'Millions of people play fantasy football, and most of them decide on gut feeling and scattered spreadsheets.\n\nPremier Fantasy puts advanced statistics and AI analysis in one place, so you can prepare your squad with better information. We do not run a fantasy game ourselves: we help you play the one you already like.\n\nYou enter your squad on your fantasy platform yourself, and nothing you do here earns points or rewards.',
    },
    {
        title: 'How We Built It',
        content:
            'Our platform is powered by data from API-Football, covering Premier League fixtures, player statistics and match events.\n\nThe AI features use GPT to analyse player form and upcoming fixtures, giving you an assessment and a match prediction that are based on data, not guesswork. AI output is informational and does not guarantee any result on any platform.\n\nYou pay with Credits only for the AI features you use. Credits never expire.',
    },
]

export function AboutSection() {
    return (
        <section id="about" className="py-10 md:py-16">
            <div className="mx-auto max-w-6xl px-6">
                {/* Header */}
                <AnimateIn variant="fadeUp">
                    <div className="mb-14 flex flex-col gap-5 lg:w-2/3">
                        <h1 className="font-heading text-4xl font-semibold tracking-tighter lg:text-5xl">
                            About Us
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            We&apos;re building an analytics tool for fantasy football managers: advanced
                            statistics and AI analysis in one place.
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
                                        Every stat and prediction is driven by Premier League data from
                                        API-Football and analysed by GPT.
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

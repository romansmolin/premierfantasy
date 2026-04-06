'use client'

import Image from 'next/image'

import { AnimateIn } from '@/shared/ui/animate-in'
import { ContainerScroll } from '@/shared/ui/container-scroll-animation'

export function HeroSection() {
    return (
        <div className="flex flex-col overflow-hidden">
            <ContainerScroll
                titleComponent={
                    <AnimateIn variant="blur">
                        <h1 className="font-heading text-4xl font-semibold text-foreground">
                            Build Your Dream Team <br />
                            <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none">
                                Premier Fantasy
                            </span>
                        </h1>
                        <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
                            Compete in 5-gameweek rolling competitions, earn coins, and use AI-powered
                            insights to dominate the Premier League fantasy game.
                        </p>
                    </AnimateIn>
                }
            >
                <Image
                    src="/assets/hero.png"
                    alt="Premier Fantasy Dashboard"
                    height={720}
                    width={1400}
                    className="mx-auto rounded-2xl object-cover h-full object-center"
                    draggable={false}
                />
            </ContainerScroll>
        </div>
    )
}

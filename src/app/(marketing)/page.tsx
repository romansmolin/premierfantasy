import { AboutSection } from '@/widgets/sections/about-section/ui/about-section'
import { CtaSection } from '@/widgets/sections/cta-section/ui/cta-section'
import { FaqSection } from '@/widgets/sections/faq-section/ui/faq-section'
import { FeatureSection } from '@/widgets/sections/feature-section/ui/feature-section'
import { FeatureTabsSection } from '@/widgets/sections/feature-tabs-section/ui/feature-tabs-section'
import { HeroSection } from '@/widgets/sections/hero-section/ui/hero-section'
import { PricingSection } from '@/widgets/sections/pricing-section/ui/pricing-section'
import { SignupSection } from '@/widgets/sections/signup-section/ui/signup-section'

import { SITE } from '@/shared/config/site'
import { InteractiveDots } from '@/shared/ui/interactive-dots'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: SITE.tagline,
    description:
        'Build a fantasy football squad from real Premier League players, compete in rolling 5-gameweek competitions, win Coins, climb private leagues, and get AI transfer and match insights.',
    alternates: { canonical: '/' },
}

export default function LandingPage() {
    return (
        <InteractiveDots>
            <HeroSection />
            <FeatureSection />
            <FeatureTabsSection />
            <AboutSection />
            <PricingSection />
            <FaqSection />
            <CtaSection />
            <SignupSection />
        </InteractiveDots>
    )
}

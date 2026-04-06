import { AboutSection } from '@/widgets/sections/about-section/ui/about-section'
import { CtaSection } from '@/widgets/sections/cta-section/ui/cta-section'
import { FaqSection } from '@/widgets/sections/faq-section/ui/faq-section'
import { FeatureSection } from '@/widgets/sections/feature-section/ui/feature-section'
import { FeatureTabsSection } from '@/widgets/sections/feature-tabs-section/ui/feature-tabs-section'
import { HeroSection } from '@/widgets/sections/hero-section/ui/hero-section'
import { SignupSection } from '@/widgets/sections/signup-section/ui/signup-section'

import { InteractiveDots } from '@/shared/ui/interactive-dots'

export default function LandingPage() {
    return (
        <InteractiveDots>
            <HeroSection />
            <FeatureSection />
            <FeatureTabsSection />
            <AboutSection />
            <FaqSection />
            <CtaSection />
            <SignupSection />
        </InteractiveDots>
    )
}

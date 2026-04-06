import { FootballPitchIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { Separator } from '@/shared/ui/separator'

const footerLinks = [
    {
        title: 'Product',
        links: [
            { label: 'Features', href: '/#features' },
            { label: 'Competitions', href: '/competitions' },
            { label: 'Pricing', href: '/#pricing' },
            { label: 'AI Insights', href: '/wallet' },
        ],
    },
    {
        title: 'Company',
        links: [
            { label: 'About', href: '/#about' },
            { label: 'FAQ', href: '/#faq' },
        ],
    },
    {
        title: 'Legal',
        links: [
            { label: 'Terms of Service', href: '/terms-of-service' },
            { label: 'Privacy Policy', href: '/private-policy' },
            { label: 'Cookie Policy', href: '/cookies-policy' },
            { label: 'Return Policy', href: '/return-policy' },
        ],
    },
]

export function Footer() {
    return (
        <footer className="relative z-20 border-t bg-background">
            <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
                <div className="grid gap-10 md:grid-cols-4">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2">
                            <HugeiconsIcon icon={FootballPitchIcon} size={20} />
                            <span className="font-heading text-lg font-bold">Premier Fantasy</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            The fairest fantasy football platform. Rolling competitions, real Premier League
                            data, and AI-powered insights.
                        </p>
                    </div>

                    {/* Link columns */}
                    {footerLinks.map((group) => (
                        <div key={group.title}>
                            <p className="mb-4 text-sm font-semibold">{group.title}</p>
                            <ul className="space-y-2.5">
                                {group.links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <Separator className="my-8" />

                <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                    <p className="text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} Premier Fantasy. All rights reserved.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Powered by API-Football &middot; Built with Next.js
                    </p>
                </div>
            </div>
        </footer>
    )
}

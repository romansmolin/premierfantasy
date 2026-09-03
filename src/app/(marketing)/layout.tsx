import { Audiowide, Montserrat } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

import { Footer } from '@/widgets/footer/ui/footer'
import { FloatingHeader } from '@/widgets/header/ui/header'

import { SITE } from '@/shared/config/site'

import type { Metadata } from 'next'

import '../globals.css'

const audiowide = Audiowide({
    weight: ['400'],
    variable: '--font-audiowide',
})

const montserrat = Montserrat({
    variable: '--font-montserrat',
    subsets: ['latin'],
})

export const metadata: Metadata = {
    metadataBase: new URL(SITE.url),
    title: {
        default: `${SITE.name} — ${SITE.tagline}`,
        template: `%s — ${SITE.name}`,
    },
    description: SITE.description,
    keywords: [
        'fantasy football',
        'Premier League fantasy',
        'fantasy soccer',
        'fantasy football leagues',
        'FPL alternative',
        'AI fantasy football',
    ],
    openGraph: {
        type: 'website',
        siteName: SITE.name,
        url: SITE.url,
        title: `${SITE.name} — ${SITE.tagline}`,
        description: SITE.description,
    },
    twitter: {
        card: 'summary_large_image',
        title: `${SITE.name} — ${SITE.tagline}`,
        description: SITE.description,
    },
}

export default function RootMarketingLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body className={`${audiowide.variable} ${montserrat.variable} antialiased`}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <FloatingHeader />
                    <main>{children}</main>
                    <Footer />
                    <Toaster richColors position="top-right" />
                </ThemeProvider>
            </body>
        </html>
    )
}

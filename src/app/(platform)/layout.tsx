import { Audiowide, Montserrat } from 'next/font/google'
import { redirect } from 'next/navigation'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

import { DashboardLayout } from '@/widgets/dashboard-layout'

import { SITE } from '@/shared/config/site'
import { getServerSession } from '@/shared/lib/get-server-session'
import { CookieNotice } from '@/shared/ui/cookie-notice'

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
        default: `Dashboard — ${SITE.name}`,
        template: `%s — ${SITE.name}`,
    },
    description: 'Explore fixtures and player stats, and use AI insights paid with Credits.',
    robots: { index: false, follow: false },
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const session = await getServerSession()

    if (!session) {
        redirect('/sign-in')
    }

    return (
        <html lang="en" className="dark">
            <body className={`${audiowide.variable} ${montserrat.variable} antialiased`}>
                <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
                    <DashboardLayout>{children}</DashboardLayout>
                    <CookieNotice />
                    <Toaster richColors position="top-right" />
                </ThemeProvider>
            </body>
        </html>
    )
}

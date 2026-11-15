import { Audiowide, Montserrat } from 'next/font/google'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'

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
        default: `Sign in — ${SITE.name}`,
        template: `%s — ${SITE.name}`,
    },
    description:
        'Sign in or create your Premier Fantasy account to explore player stats and use AI insights.',
    robots: { index: false, follow: false },
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const session = await getServerSession()

    if (session) {
        redirect('/dashboard')
    }

    return (
        <html lang="en">
            <body className={`${audiowide.variable} ${montserrat.variable} antialiased`}>
                <main className="h-svh flex items-center justify-center">
                    <section className="flex p-2 border border-primary rounded-2xl min-h-[70vh] max-h-125 w-full max-w-5xl">
                        <div className="flex-1 p-10">{children}</div>
                        <div className="flex-1 rounded-xl bg-primary">
                            <Image
                                src={'/assets/image.png'}
                                alt={'Premier Fantasy'}
                                width={500}
                                height={600}
                                className="size-full rounded-xl object-cover"
                            />
                        </div>
                    </section>
                </main>
                <CookieNotice />
                <Toaster richColors position="top-right" />
            </body>
        </html>
    )
}

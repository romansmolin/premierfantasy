'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'premier-fantasy-cookie-preferences'

export function CookieNotice() {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const timer = window.setTimeout(() => setOpen(!localStorage.getItem(STORAGE_KEY)), 0)
        const show = () => setOpen(true)

        window.addEventListener('cookie-preferences', show)

        return () => {
            window.clearTimeout(timer)
            window.removeEventListener('cookie-preferences', show)
        }
    }, [])

    function save(choice: 'essential' | 'optional') {
        localStorage.setItem(STORAGE_KEY, choice)
        setOpen(false)
    }

    if (!open) return null

    return (
        <aside
            aria-label="Cookie preferences"
            className="fixed inset-x-4 bottom-4 z-100 mx-auto max-w-3xl rounded-xl border bg-background p-5 shadow-xl"
        >
            <h2 className="font-semibold">Cookie preferences</h2>
            <p className="mt-2 text-sm text-muted-foreground">
                We use necessary storage for sign-in and site functionality. No optional analytics or
                advertising cookies are currently used. You can change your choice at any time in our{' '}
                <Link href="/cookies-policy" className="underline">
                    Cookie Policy
                </Link>
                .
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
                <button className="rounded-md border px-4 py-2 text-sm" onClick={() => save('essential')}>
                    Essential only
                </button>
                <button
                    className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
                    onClick={() => save('optional')}
                >
                    Allow optional cookies
                </button>
            </div>
        </aside>
    )
}

export function CookiePreferencesButton() {
    return (
        <button className="underline" onClick={() => window.dispatchEvent(new Event('cookie-preferences'))}>
            Change cookie preferences
        </button>
    )
}

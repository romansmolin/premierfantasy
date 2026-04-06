import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
    '/',
    '/sign-in',
    '/sign-up',
    '/terms-of-service',
    '/private-policy',
    '/cookies-policy',
    '/return-policy',
]

function hasSessionCookie(request: NextRequest): boolean {
    for (const [name] of request.cookies) {
        if (name.includes('session_token')) return true
    }

    return false
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Never intercept API routes
    if (pathname.startsWith('/api')) {
        return NextResponse.next()
    }

    const hasSession = hasSessionCookie(request)

    const isPublicRoute = PUBLIC_PATHS.some(
        (path) => pathname === path || (path !== '/' && pathname.startsWith(path + '/')),
    )

    if (!isPublicRoute && !hasSession) {
        return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    if ((pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) && hasSession) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

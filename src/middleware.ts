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
    const cookieNames = [
        'better-auth.session_token',
        '__Secure-better-auth.session_token',
        '__Host-better-auth.session_token',
    ]

    for (const name of cookieNames) {
        if (request.cookies.get(name)?.value) return true
    }

    // Fallback: check if ANY cookie contains "session_token"
    for (const [name] of request.cookies) {
        if (name.includes('session_token')) return true
    }

    return false
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    const hasSession = hasSessionCookie(request)

    const isPublicRoute = PUBLIC_PATHS.some(
        (path) => pathname === path || (path !== '/' && pathname.startsWith(path + '/')),
    )

    // Unauthenticated user on protected route → send to sign-in
    if (!isPublicRoute && !hasSession) {
        return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    // Authenticated user on auth pages → send to dashboard
    if ((pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) && hasSession) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|public|assets|api).*)'],
}

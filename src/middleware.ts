import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/fantasy-team-builder', '/wallet', '/profile', '/competitions']
const authRoutes = ['/sign-up', '/sign-in']

function hasSessionCookie(request: NextRequest): boolean {
    // Better Auth cookie names vary by environment:
    // HTTP (localhost): better-auth.session_token
    // HTTPS (production): __Secure-better-auth.session_token
    // Some configurations also use: better-auth.session_token without prefix
    const cookieNames = [
        'better-auth.session_token',
        '__Secure-better-auth.session_token',
        '__Host-better-auth.session_token',
    ]

    for (const name of cookieNames) {
        const cookie = request.cookies.get(name)

        if (cookie?.value) return true
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

    const isProtectedRoute = protectedRoutes.some(
        (route) => pathname === route || pathname.startsWith(route + '/'),
    )
    const isAuthRoute = authRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))

    if (isProtectedRoute && !hasSession) {
        return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    if (isAuthRoute && hasSession) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|public|api|assets).*)'],
}

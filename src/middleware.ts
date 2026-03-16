import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    const sessionCookie = request.cookies.get('better-auth.session_token')
    const hasSession = !!sessionCookie?.value

    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/team-builder')
    const isAuthRoute = pathname.startsWith('/sign-up')

    if (isProtectedRoute && !hasSession) {
        return NextResponse.redirect(new URL('/sign-up', request.url))
    }

    if (isAuthRoute && hasSession) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|public|api|gifts-1|gifts-2|gifts-3).*)'],
}

import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/fantasy-team-builder', '/wallet', '/profile', '/competitions']
const authRoutes = ['/sign-up', '/sign-in']

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Better Auth uses __Secure- prefix on HTTPS (production)
    const sessionCookie =
        request.cookies.get('better-auth.session_token') ??
        request.cookies.get('__Secure-better-auth.session_token')
    const hasSession = !!sessionCookie?.value

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

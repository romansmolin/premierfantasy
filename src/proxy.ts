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
    '/players',
    '/fixtures',
    '/how-we-calculate',
    '/sitemap.xml',
]

function hasSessionCookie(request: NextRequest): boolean {
    const names = [
        'better-auth.session_token',
        '__Secure-better-auth.session_token',
        'premier-fantasy.session_token',
        '__Secure-premier-fantasy.session_token',
    ]

    return names.some((name) => Boolean(request.cookies.get(name)?.value))
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Never intercept API routes
    if (pathname.startsWith('/api')) {
        return NextResponse.next()
    }

    const isPublicRoute = PUBLIC_PATHS.some(
        (path) => pathname === path || (path !== '/' && pathname.startsWith(path + '/')),
    )

    if (!isPublicRoute && !hasSessionCookie(request)) {
        return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.webp$|.*\\.ico$).*)',
    ],
}

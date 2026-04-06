import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const allCookies: Record<string, string> = {}

    for (const [name, value] of req.cookies) {
        allCookies[name] = String(value).substring(0, 20) + '...'
    }

    return NextResponse.json({
        cookieCount: Object.keys(allCookies).length,
        cookieNames: Object.keys(allCookies),
        cookies: allCookies,
        headers: {
            host: req.headers.get('host'),
            origin: req.headers.get('origin'),
            referer: req.headers.get('referer'),
        },
    })
}

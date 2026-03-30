import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token')
    const status = req.nextUrl.searchParams.get('status') ?? 'unknown'
    const uid = req.nextUrl.searchParams.get('uid') ?? ''

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const redirectUrl = `${appUrl}/wallet?payment=${status}&token=${token}&uid=${uid}`

    return NextResponse.redirect(redirectUrl)
}

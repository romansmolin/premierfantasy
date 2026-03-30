import { NextResponse } from 'next/server'

import { COIN_PACKS } from '@/server/wallet/lib/coin-pricing'

export async function GET() {
    return NextResponse.json(COIN_PACKS)
}

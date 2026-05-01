export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { container } from '@/shared/lib/container'

import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    return container.paymentController.handleReturn(req)
}

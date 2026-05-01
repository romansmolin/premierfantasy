export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { container } from '@/shared/lib/container'

import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
    return container.paymentController.handleWebhook(req)
}

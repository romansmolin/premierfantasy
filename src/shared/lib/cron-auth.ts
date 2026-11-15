import { assertBearerSecret } from './bearer-auth'

import type { NextRequest } from 'next/server'

/** Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when the CRON_SECRET env var is set on the project. */
export function assertCron(req: NextRequest): void {
    assertBearerSecret(req, 'CRON_SECRET')
}

import { assertBearerSecret } from './bearer-auth'

import type { NextRequest } from 'next/server'

/** Admin routes: `Authorization: Bearer ${ADMIN_SECRET}`. */
export function assertAdmin(req: NextRequest): void {
    assertBearerSecret(req, 'ADMIN_SECRET')
}

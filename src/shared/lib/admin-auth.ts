import { timingSafeEqual } from 'node:crypto'

import { Errors } from './http'

import type { NextRequest } from 'next/server'

/** Admin routes: `Authorization: Bearer ${ADMIN_SECRET}`. 500 when the secret is not configured, 401 on mismatch. */
export function assertAdmin(req: NextRequest): void {
    const secret = process.env.ADMIN_SECRET

    if (!secret) throw Errors.internal('ADMIN_SECRET is not configured')

    const expected = Buffer.from(`Bearer ${secret}`)
    const given = Buffer.from(req.headers.get('authorization') ?? '')

    if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw Errors.unauthorized()
}

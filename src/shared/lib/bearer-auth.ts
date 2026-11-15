import { timingSafeEqual } from 'node:crypto'

import { Errors } from './http'

import type { NextRequest } from 'next/server'

/** `Authorization: Bearer ${process.env[envVar]}`. 500 when the secret is not configured, 401 on mismatch. */
export function assertBearerSecret(req: NextRequest, envVar: string): void {
    const secret = process.env[envVar]

    if (!secret) throw Errors.internal(`${envVar} is not configured`)

    const expected = Buffer.from(`Bearer ${secret}`)
    const given = Buffer.from(req.headers.get('authorization') ?? '')

    if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw Errors.unauthorized()
}

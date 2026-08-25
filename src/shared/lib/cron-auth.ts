/**
 * Vercel Cron authorization: the platform calls cron paths with
 * `Authorization: Bearer ${CRON_SECRET}`. Server-only — the secret must never
 * appear in a NEXT_PUBLIC_* variable or client bundle.
 */
export function isCronAuthorized(authHeader: string | null): boolean {
    const secret = process.env.CRON_SECRET

    // No secret configured = locked shut, not wide open.
    if (!secret) return false

    return authHeader === `Bearer ${secret}`
}

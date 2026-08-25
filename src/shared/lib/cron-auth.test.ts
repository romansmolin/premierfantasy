import { afterEach, describe, expect, it, vi } from 'vitest'

import { isCronAuthorized } from './cron-auth'

describe('isCronAuthorized', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('accepts the Vercel-style bearer header', () => {
        vi.stubEnv('CRON_SECRET', 's3cret')

        expect(isCronAuthorized('Bearer s3cret')).toBe(true)
    })

    it('rejects a missing header', () => {
        vi.stubEnv('CRON_SECRET', 's3cret')

        expect(isCronAuthorized(null)).toBe(false)
    })

    it('rejects a wrong secret', () => {
        vi.stubEnv('CRON_SECRET', 's3cret')

        expect(isCronAuthorized('Bearer wrong')).toBe(false)
    })

    it('rejects everything when no secret is configured', () => {
        vi.stubEnv('CRON_SECRET', '')

        expect(isCronAuthorized('Bearer ')).toBe(false)
        expect(isCronAuthorized(null)).toBe(false)
    })
})

import { defineConfig, devices } from '@playwright/test'

const PORT = 3101
const databaseUrl = process.env.E2E_DATABASE_URL ?? ''

// The suite creates a user, spends credits and saves squads: never against a shared or production database.
if (!databaseUrl || !/(localhost|127\.0\.0\.1|\[::1\])/.test(databaseUrl)) {
    throw new Error(
        'Set E2E_DATABASE_URL to a local Postgres (localhost) with the app schema and synced data.',
    )
}

const origin = `http://localhost:${PORT}`
const env = {
    STORAGE_DATABASE_URL: databaseUrl,
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_URL: origin,
    NEXT_PUBLIC_APP_URL: origin,
    BETTER_AUTH_SECRET: 'e2e-secret-not-used-anywhere-else-0123456789',
    // Not a real key: AI calls fail, which the app must survive (explanation is optional).
    CRON_SECRET: 'e2e-cron-secret',
    OPENAI_API_KEY: 'e2e-not-a-real-key',
    NEXT_DIST_DIR: '.next-e2e',
    TEST_USER_EMAIL: 'e2e@example.com',
    TEST_USER_PASSWORD: 'e2e-password-12345',
    TEST_USER_CREDITS: '1000',
}

Object.assign(process.env, env)

export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    fullyParallel: false,
    workers: 1,
    reporter: [['list']],
    use: { baseURL: origin, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /responsive\.spec\.ts/ },
        { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /responsive\.spec\.ts/ },
    ],
    globalSetup: './e2e/global-setup.ts',
    webServer: {
        command: `npx next build && npx next start -p ${PORT}`,
        url: `${origin}/how-we-calculate`,
        timeout: 600_000,
        reuseExistingServer: !process.env.CI,
        env,
    },
})

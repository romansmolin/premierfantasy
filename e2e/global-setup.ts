import { execFileSync } from 'node:child_process'

import { chromium } from '@playwright/test'

import { PASSWORD, POOR_EMAIL, RICH_EMAIL } from './users'

const run = (script: string, env: Record<string, string> = {}) =>
    execFileSync('npx', ['tsx', script], { stdio: 'inherit', env: { ...process.env, ...env } })

async function signIn(origin: string, email: string, file: string) {
    const browser = await chromium.launch()
    const page = await browser.newPage()

    await page.goto(`${origin}/sign-in`)
    await page.fill('#sign-in-email', email)
    await page.fill('#sign-in-password', PASSWORD)
    await page.click('button[type=submit]')
    await page.waitForURL(/\/dashboard/)
    await page.context().storageState({ path: file })
    await browser.close()
}

/** Creates the two test users from scratch and saves their signed-in sessions. */
export default async function globalSetup(config: { projects: { use: { baseURL?: string } }[] }) {
    const origin = config.projects[0].use.baseURL as string

    run('e2e/reset-users.ts')
    run('scripts/create-test-user.ts', {
        TEST_USER_EMAIL: RICH_EMAIL,
        TEST_USER_PASSWORD: PASSWORD,
        TEST_USER_CREDITS: '1000',
    })
    run('scripts/create-test-user.ts', {
        TEST_USER_EMAIL: POOR_EMAIL,
        TEST_USER_PASSWORD: PASSWORD,
        TEST_USER_CREDITS: '100',
    })

    await signIn(origin, RICH_EMAIL, 'e2e/.auth/rich.json')
    await signIn(origin, POOR_EMAIL, 'e2e/.auth/poor.json')
}

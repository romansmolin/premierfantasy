import { expect, test } from '@playwright/test'

import { choose } from './helpers'
import { RICH_STATE } from './users'

import type { Page } from '@playwright/test'

async function openScout(page: Page) {
    await page.goto('/scout')
    await page
        .getByRole('button', { name: 'Essential only' })
        .click({ timeout: 2000 })
        .catch(() => undefined)
    await expect(page.getByRole('heading', { name: 'Scout players' })).toBeVisible()
}

const boxes = (page: Page) => page.getByRole('checkbox', { name: /^Compare / })

test.describe('scout section, signed out', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    for (const path of ['/scout', '/scout/some-player', '/scout/compare?ids=a,b']) {
        test(`${path} sends a guest to sign in`, async ({ page }) => {
            await page.goto(path)

            await expect(page).toHaveURL(/\/sign-in/)
        })
    }

    test('the scout API answers 401 without a session', async ({ page }) => {
        expect((await page.request.get('/api/scout/players')).status()).toBe(401)
        expect((await page.request.get('/api/scout/players/some-player')).status()).toBe(401)
        expect((await page.request.get('/api/scout/compare?ids=a,b')).status()).toBe(401)
    })

    test('the public players page still opens without a login', async ({ page }) => {
        await page.goto('/players')

        await expect(page.getByRole('heading', { name: 'Premier League players' })).toBeVisible()
    })
})

test.describe('scout section, signed in', () => {
    test.use({ storageState: RICH_STATE })

    test('the sidebar reaches the scout list', async ({ page }) => {
        await page.goto('/dashboard')
        await page.getByRole('link', { name: 'Players', exact: true }).click()

        await expect(page).toHaveURL(/\/scout$/)
        await expect(page.getByRole('heading', { name: 'Scout players' })).toBeVisible()
    })

    test('a player row opens the profile with a way to compare', async ({ page }) => {
        await openScout(page)
        await page.getByRole('row').nth(1).getByRole('link').first().click()

        await expect(page).toHaveURL(/\/scout\/[^/]+$/)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Compare with…' })).toBeVisible()
    })

    test('two players of one position are compared side by side', async ({ page }) => {
        await openScout(page)
        await choose(page, 'Position', 'MID')
        await boxes(page).nth(0).click()
        await boxes(page).nth(1).click()
        await page.getByRole('link', { name: 'Compare', exact: true }).click()

        await expect(page).toHaveURL(/\/scout\/compare\?ids=[^,]+,[^,]+$/)
        await expect(page.getByRole('heading', { name: 'Compare MID players' })).toBeVisible()
        await expect(page.getByText('Side by side')).toBeVisible()
        await expect(page.getByRole('cell', { name: 'Goals', exact: true })).toBeVisible()
        await expect(page.getByRole('link', { name: '← Back to players' })).toBeVisible()
    })

    test('a player of another position cannot join the comparison', async ({ page }) => {
        await openScout(page)
        await choose(page, 'Position', 'MID')
        await boxes(page).nth(0).click()
        await choose(page, 'Position', 'FWD')
        await boxes(page).nth(0).click()

        await expect(page.getByRole('status')).toContainText('one position')
        await expect(page.getByRole('link', { name: 'Compare', exact: true })).toHaveCount(0)
    })

    test('a compare link with one player explains what to do', async ({ page }) => {
        await page.goto('/scout/compare?ids=only-one')

        await expect(page.getByText(/Pick 2–3 players/)).toBeVisible()
    })
})

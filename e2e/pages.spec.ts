import { expect, test } from '@playwright/test'

import { RICH_EMAIL, RICH_STATE } from './users'

test.use({ storageState: RICH_STATE })

test.describe('signed-in pages', () => {
    test('the dashboard shows the balance and upcoming fixtures', async ({ page }) => {
        await page.goto('/dashboard')

        await expect(page.getByText('Welcome, ')).toBeVisible()
        await expect(page.getByText(/\d[\d,]* Credits/).first()).toBeVisible()
        await expect(page.getByRole('link', { name: 'Get Credits' })).toBeVisible()
        await expect(page.getByText('Upcoming Fixtures')).toBeVisible()
    })

    test('the credits page lists all four AI features with their prices', async ({ page }) => {
        await page.goto('/wallet')

        for (const [name, price] of [
            ['Player analysis', 10],
            ['Match prediction', 10],
            ['Squad review', 30],
            ['Auto-build', 300],
        ] as const) {
            const feature = page.getByText(name, { exact: true })

            await expect(feature).toBeVisible()
            await expect(feature.locator('xpath=following-sibling::p[1]')).toHaveText(`${price} Credits`)
        }
    })

    test('the sidebar reaches the builder and the profile shows the account', async ({ page }) => {
        await page.goto('/dashboard')
        await page.getByRole('link', { name: 'Builder' }).click()
        await expect(page).toHaveURL(/\/builder/)

        await page.getByRole('link', { name: 'Profile' }).click()
        await expect(page.getByText(RICH_EMAIL).first()).toBeVisible()
    })
})

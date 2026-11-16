import { expect, test } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('public pages (no login)', () => {
    test('players table shows prices, form and the forecast, and filters by name', async ({ page }) => {
        await page.goto('/players')
        await page
            .getByRole('button', { name: 'Essential only' })
            .click({ timeout: 2000 })
            .catch(() => undefined)

        await expect(page.getByRole('heading', { name: 'Premier League players' })).toBeVisible()
        await expect(page.getByText(/Forecast = expected FPL points for gameweek \d+/)).toBeVisible()
        await expect(page.getByRole('row').nth(1)).toContainText('£')

        await page.getByLabel('Search').fill('Haaland')
        await page.getByRole('button', { name: 'Apply' }).click()

        await expect(page).toHaveURL(/q=Haaland/)
        await expect(page.getByRole('row', { name: /Haaland/ })).toBeVisible()
    })

    test('fixtures and the method page load, and the method page states the accuracy bar', async ({
        page,
    }) => {
        await page.goto('/fixtures')
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

        await page.goto('/how-we-calculate')
        await expect(page.getByText(/baseline/i).first()).toBeVisible()
    })

    test('sitemap lists the public pages', async ({ request }) => {
        const xml = await (await request.get('/sitemap.xml')).text()

        expect(xml).toContain('/players')
        expect(xml).toContain('/how-we-calculate')
    })

    test('the builder and the dashboard send signed-out visitors to sign in', async ({ page }) => {
        await page.goto('/builder')
        await expect(page).toHaveURL(/\/sign-in/)

        await page.goto('/dashboard')
        await expect(page).toHaveURL(/\/sign-in/)
    })

    test('paid and private APIs refuse signed-out requests', async ({ request }) => {
        for (const call of [
            () => request.post('/api/autobuild', { data: {} }),
            () => request.post('/api/squads/x/review', { data: {} }),
            () => request.get('/api/builder/pool'),
            () => request.get('/api/squads'),
            () => request.post('/api/ai/player-analysis', { data: { playerId: 1 } }),
        ]) {
            expect((await call()).status()).toBe(401)
        }
    })

    test('the cron endpoint refuses requests without the secret', async ({ request }) => {
        expect((await request.get('/api/cron/sync')).status()).toBe(401)
    })
})

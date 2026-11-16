import { expect, test } from '@playwright/test'

import { balanceOf, clearSquads, fillWholeSquad, openBuilder } from './helpers'
import { POOR_STATE, RICH_STATE } from './users'

test.describe.configure({ mode: 'serial' })

test.describe('auto-build and squad review (rich user, 1000 credits)', () => {
    test.use({ storageState: RICH_STATE })

    test.beforeEach(async ({ page }) => {
        page.on('dialog', (dialog) => dialog.accept())
        await clearSquads(page)
        await openBuilder(page)
    })

    test('auto-build fills a legal squad, costs 300, and a repeat is free', async ({ page }) => {
        const before = await balanceOf(page)

        await page.getByRole('button', { name: /Auto-build \(300 Credits\)/ }).click()
        await expect(page.getByText(/Loaded into the builder/)).toBeVisible({ timeout: 60_000 })

        await expect(page.getByText('15 of 15 players')).toBeVisible()
        await expect(page.getByText('This squad follows the FPL rules.')).toBeVisible()
        await expect(page.getByRole('button', { name: /open actions/ })).toHaveCount(15)
        await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()
        expect(await balanceOf(page)).toBe(before - 300)

        // Same constraints, same gameweek: shown again without paying.
        await page.getByRole('button', { name: /Auto-build \(300 Credits\)/ }).click()
        await expect(page.getByText(/Loaded into the builder/)).toBeVisible({ timeout: 60_000 })
        expect(await balanceOf(page)).toBe(before - 300)
    })

    test('auto-build keeps a locked player and never picks an excluded one', async ({ page }) => {
        // Exclude the best goalkeeper and pin one of the cheapest defenders.
        await page.getByRole('button', { name: 'Add GK', exact: true }).click()

        const dialog = page.getByRole('dialog')
        const best = (await dialog.getByRole('listitem').first().getAttribute('data-player')) as string

        await dialog.getByRole('listitem').first().getByRole('button', { name: 'Exclude' }).click()
        await dialog.getByRole('button', { name: 'Close' }).click()

        await page.getByRole('button', { name: 'Add DEF', exact: true }).first().click()
        await page.getByRole('dialog').getByLabel('Sort by').selectOption('price')
        await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).last().click()

        const defender = page.getByRole('button', { name: /open actions/ }).first()
        const pinned = ((await defender.getAttribute('aria-label')) as string).replace(', open actions', '')

        await defender.click()
        await page.getByRole('menuitem', { name: 'Keep in auto-build' }).click()
        await expect(page.getByText(`locked: ${pinned}`)).toBeVisible()
        await expect(page.getByText(`excluded: ${best}`)).toBeVisible()

        await page.getByRole('button', { name: /Auto-build \(300 Credits\)/ }).click()
        await expect(page.getByText(/Loaded into the builder/)).toBeVisible({ timeout: 60_000 })

        const names = await page
            .getByRole('button', { name: /open actions/ })
            .evaluateAll((els) =>
                els.map((e) => (e.getAttribute('aria-label') ?? '').replace(', open actions', '')),
            )

        expect(names).toContain(pinned)
        expect(names).not.toContain(best)
        await expect(page.getByText('This squad follows the FPL rules.')).toBeVisible()
    })

    test('a review needs a saved squad, and a failed review costs nothing', async ({ page }) => {
        await expect(page.getByRole('button', { name: /AI review \(30 Credits\)/ })).toBeDisabled()

        await fillWholeSquad(page, 'cheapest')
        await page
            .locator('[data-row="FWD"] > div')
            .nth(0)
            .getByRole('button', { name: /open actions/ })
            .click()
        await page.getByRole('menuitem', { name: 'Make captain' }).click()
        await page
            .locator('[data-row="FWD"] > div')
            .nth(1)
            .getByRole('button', { name: /open actions/ })
            .click()
        await page.getByRole('menuitem', { name: 'Make vice-captain' }).click()
        await page.getByRole('button', { name: 'Save' }).click()
        await expect(page.getByText('Squad saved')).toBeVisible()

        const before = await balanceOf(page)

        // The e2e server has no working OpenAI key: the review must fail cleanly and leave the balance alone.
        await page.getByRole('button', { name: /AI review \(30 Credits\)/ }).click()
        await expect(page.getByRole('button', { name: /AI review \(30 Credits\)/ })).toBeEnabled({
            timeout: 60_000,
        })
        expect(await balanceOf(page)).toBe(before)
    })
})

test.describe('not enough credits (100 credits)', () => {
    test.use({ storageState: POOR_STATE })

    test('auto-build says how many credits are needed and charges nothing', async ({ page }) => {
        page.on('dialog', (dialog) => dialog.accept())
        await openBuilder(page)

        const before = await balanceOf(page)

        await page.getByRole('button', { name: /Auto-build \(300 Credits\)/ }).click()

        await expect(page.getByText('Not enough credits: you need 300.')).toBeVisible({ timeout: 30_000 })
        expect(await balanceOf(page)).toBe(before)
        await expect(page.getByRole('button', { name: /open actions/ })).toHaveCount(0)
    })
})

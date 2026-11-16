import { expect, test } from '@playwright/test'

import { choose, clearSquads, fillSlot, fillWholeSquad, openBuilder, pickFromDialog } from './helpers'
import { RICH_STATE } from './users'

test.use({ storageState: RICH_STATE })

test.beforeEach(async ({ page }) => {
    await clearSquads(page)
    await openBuilder(page)
})

const slotsIn = (page: import('@playwright/test').Page, row: string) =>
    page.locator(`[data-row="${row}"] > div`)

test.describe('building a squad by hand', () => {
    test('starts with an empty pitch: 11 slots, 4 bench slots, 4-4-2', async ({ page }) => {
        await expect(page.getByRole('combobox', { name: 'Formation' })).toHaveText('4-4-2')
        await expect(slotsIn(page, 'FWD')).toHaveCount(2)
        await expect(slotsIn(page, 'MID')).toHaveCount(4)
        await expect(slotsIn(page, 'DEF')).toHaveCount(4)
        await expect(slotsIn(page, 'GK')).toHaveCount(1)
        await expect(slotsIn(page, 'bench')).toHaveCount(4)
        await expect(page.getByTestId('player-count')).toHaveText(/^0\s*\/\s*15$/)
        await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
    })

    test('changing the formation redraws the rows', async ({ page }) => {
        await choose(page, 'Formation', '3-5-2')

        await expect(slotsIn(page, 'DEF')).toHaveCount(3)
        await expect(slotsIn(page, 'MID')).toHaveCount(5)
        await expect(slotsIn(page, 'FWD')).toHaveCount(2)
    })

    test('an empty slot opens a picker that only offers that position', async ({ page }) => {
        await page.getByRole('button', { name: 'Add GK', exact: true }).click()

        const dialog = page.getByRole('dialog', { name: 'Pick a goalkeeper' })

        await expect(dialog).toBeVisible()

        const rows = dialog.getByRole('listitem')

        expect(await rows.count()).toBeGreaterThan(5)
        await expect(dialog.getByRole('button', { name: 'DEF' })).toHaveCount(0)

        await dialog.getByPlaceholder('Search by name').fill('Raya')
        await expect(rows).toHaveCount(1)
        await expect(rows.first()).toContainText('Raya')
    })

    test('picking a player puts a card on the pitch and spends budget', async ({ page }) => {
        await fillSlot(page, 'Add GK', 'priciest')

        await expect(page.getByTestId('player-count')).toHaveText(/^1\s*\/\s*15$/)
        await expect(slotsIn(page, 'GK').getByRole('button', { name: /open actions/ })).toHaveCount(1)
        await expect(page.getByText(/£[1-9][\d.]*m of £100\.0m spent/)).toBeVisible()
    })

    test('a card shows the player photo', async ({ page }) => {
        const png = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            'base64',
        )

        // The image optimizer would fetch from api-sports.io; stub it so the test does not need the internet.
        await page.route('**/_next/image**', (route) =>
            route.fulfill({ contentType: 'image/png', body: png }),
        )
        await fillSlot(page, 'Add GK', 'priciest')

        const card = slotsIn(page, 'GK').getByRole('button', { name: /open actions/ })
        const photo = card.locator('img[src*="players"]')

        await expect(photo).toBeVisible()
        expect(decodeURIComponent((await photo.getAttribute('src')) ?? '')).toMatch(
            /media\.api-sports\.io\/football\/players\/\d+\.png/,
        )
    })

    test('a card falls back to a silhouette when the photo cannot be loaded', async ({ page }) => {
        await page.route('**/_next/image**', (route) => route.fulfill({ status: 404 }))
        await fillSlot(page, 'Add GK', 'priciest')

        const card = slotsIn(page, 'GK').getByRole('button', { name: /open actions/ })

        await expect(card).toBeVisible()
        await expect(card.locator('img[src*="players"]')).toHaveCount(0)
        await expect(card.locator('svg').first()).toBeVisible()
    })

    test('a player already in the squad cannot be added twice', async ({ page }) => {
        await fillSlot(page, 'Add MID', 'priciest')
        await page.getByRole('button', { name: 'Add MID', exact: true }).first().click()

        const dialog = page.getByRole('dialog')

        await choose(dialog, 'Sort by', 'Price')
        await expect(dialog.getByRole('button', { name: 'In squad' })).toBeDisabled()
    })

    test('the club limit blocks a fourth player of one club', async ({ page }) => {
        // Three players of Arsenal: a goalkeeper, a defender and a midfielder.
        for (const slot of ['Add GK', 'Add DEF', 'Add MID']) {
            await page.getByRole('button', { name: slot, exact: true }).first().click()

            const dialog = page.getByRole('dialog')

            await choose(dialog, 'Club', 'Arsenal')
            await dialog.getByRole('button', { name: 'Add', exact: true }).first().click()
            await expect(dialog).toBeHidden()
        }

        await page.getByRole('button', { name: 'Add FWD', exact: true }).first().click()

        const dialog = page.getByRole('dialog')

        await choose(dialog, 'Club', 'Arsenal')
        await expect(dialog.getByRole('button', { name: 'Club limit' }).first()).toBeDisabled()
        await expect(dialog.getByRole('button', { name: 'Add', exact: true })).toHaveCount(0)
    })

    test('the captain and the vice-captain are set from the card menu', async ({ page }) => {
        await fillSlot(page, 'Add FWD')
        await fillSlot(page, 'Add FWD')

        const [first, second] = [
            slotsIn(page, 'FWD')
                .nth(0)
                .getByRole('button', { name: /open actions/ }),
            slotsIn(page, 'FWD')
                .nth(1)
                .getByRole('button', { name: /open actions/ }),
        ]

        await first.click()
        await page.getByRole('menuitem', { name: 'Make captain' }).click()
        await expect(first.getByText('C', { exact: true })).toBeVisible()

        await second.click()
        await page.getByRole('menuitem', { name: 'Make vice-captain' }).click()
        await expect(second.getByText('V', { exact: true })).toBeVisible()

        // Making the vice-captain the captain removes the vice badge instead of leaving one player with two roles.
        await second.click()
        await page.getByRole('menuitem', { name: 'Make captain' }).click()
        await expect(second.getByText('C', { exact: true })).toBeVisible()
        await expect(second.getByText('V', { exact: true })).toHaveCount(0)
        // ...and the old captain takes the vice role.
        await expect(first.getByText('V', { exact: true })).toBeVisible()
    })

    test('a card can be replaced and removed', async ({ page }) => {
        await fillSlot(page, 'Add GK')

        const card = slotsIn(page, 'GK').getByRole('button', { name: /open actions/ })
        const before = await card.getAttribute('aria-label')

        await card.click()
        await page.getByRole('menuitem', { name: /Replace with another goalkeeper/ }).click()
        await pickFromDialog(page, 'priciest')

        await expect(slotsIn(page, 'GK').getByRole('button', { name: /open actions/ })).not.toHaveAttribute(
            'aria-label',
            before ?? '',
        )

        await slotsIn(page, 'GK')
            .getByRole('button', { name: /open actions/ })
            .click()
        await page.getByRole('menuitem', { name: 'Remove from squad' }).click()
        await expect(page.getByRole('button', { name: 'Add GK', exact: true })).toBeVisible()
        await expect(page.getByTestId('player-count')).toHaveText(/^0\s*\/\s*15$/)
    })

    test('an over-budget squad is flagged and cannot be saved', async ({ page }) => {
        await fillWholeSquad(page, 'priciest')

        await expect(page.getByText(/£[\d.]+m over/)).toBeVisible()
        await expect(page.getByText('Over the budget of £100.0m')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
    })

    test('a full legal squad can be saved, reopened and deleted', async ({ page }) => {
        await fillWholeSquad(page, 'cheapest')

        await slotsIn(page, 'FWD')
            .nth(0)
            .getByRole('button', { name: /open actions/ })
            .click()
        await page.getByRole('menuitem', { name: 'Make captain' }).click()
        await slotsIn(page, 'FWD')
            .nth(1)
            .getByRole('button', { name: /open actions/ })
            .click()
        await page.getByRole('menuitem', { name: 'Make vice-captain' }).click()

        await expect(page.getByTestId('player-count')).toHaveText(/^15\s*\/\s*15$/)
        await expect(page.getByText('This squad follows the FPL rules.')).toBeVisible()

        await page.getByLabel('Squad name').fill('E2E squad')
        await page.getByRole('button', { name: 'Save' }).click()
        await expect(page.getByText('Squad saved')).toBeVisible()
        await expect(page.getByText('E2E squad').last()).toBeVisible()

        const cards = await page
            .getByRole('button', { name: /open actions/ })
            .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))

        await page.reload()
        await page
            .getByRole('button', { name: 'Essential only' })
            .click({ timeout: 2000 })
            .catch(() => undefined)
        await page.getByRole('button', { name: 'Open' }).first().click()

        await expect(page.getByTestId('player-count')).toHaveText(/^15\s*\/\s*15$/)
        await expect(page.getByRole('button', { name: /open actions/ })).toHaveCount(15)

        const reopened = await page
            .getByRole('button', { name: /open actions/ })
            .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))

        expect([...reopened].sort()).toEqual([...cards].sort())

        await page.getByRole('button', { name: 'Delete' }).first().click()
        await expect(page.getByText('Nothing saved yet.')).toBeVisible()
    })

    test('changing the formation moves players between the pitch and the bench without losing anyone', async ({
        page,
    }) => {
        await fillWholeSquad(page, 'cheapest')
        await choose(page, 'Formation', '3-5-2')

        await expect(page.getByRole('button', { name: /open actions/ })).toHaveCount(15)
        await expect(slotsIn(page, 'DEF')).toHaveCount(3)
        await expect(slotsIn(page, 'MID')).toHaveCount(5)
        await expect(slotsIn(page, 'DEF').getByRole('button', { name: /open actions/ })).toHaveCount(3)
        await expect(slotsIn(page, 'MID').getByRole('button', { name: /open actions/ })).toHaveCount(5)
        await expect(slotsIn(page, 'bench').getByRole('button', { name: /open actions/ })).toHaveCount(4)
    })
})

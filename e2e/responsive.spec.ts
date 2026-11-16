import { expect, test } from '@playwright/test'

import { clearSquads, fillSlot, openBuilder } from './helpers'
import { RICH_STATE } from './users'

test.use({ storageState: RICH_STATE })

test('the builder fits a phone screen without sideways scrolling', async ({ page }) => {
    await clearSquads(page)
    await openBuilder(page)

    for (const slot of ['Add GK', 'Add DEF', 'Add MID', 'Add FWD']) await fillSlot(page, slot, 'priciest')

    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )

    expect(overflow).toBeLessThanOrEqual(0)

    // Every row of the pitch is fully on screen.
    for (const row of ['FWD', 'MID', 'DEF', 'GK', 'bench']) {
        const box = await page.locator(`[data-row="${row}"]`).boundingBox()
        const width = page.viewportSize()?.width ?? 0

        expect(box?.x ?? -1).toBeGreaterThanOrEqual(0)
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width)
    }
})

test('the picker is usable on a phone', async ({ page }) => {
    await openBuilder(page)
    await page.getByRole('button', { name: 'Add GK', exact: true }).click()

    const dialog = page.getByRole('dialog')

    await expect(dialog).toBeVisible()

    const box = await dialog.boundingBox()
    const width = page.viewportSize()?.width ?? 0

    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width)
    await expect(dialog.getByRole('button', { name: 'Add', exact: true }).first()).toBeVisible()
})

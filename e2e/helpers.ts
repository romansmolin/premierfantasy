import { expect } from '@playwright/test'

import type { Locator, Page } from '@playwright/test'

/** Chooses an option of a shadcn select (a combobox button with a popup list). */
export async function choose(scope: Page | Locator, label: string, option: string) {
    const page = 'page' in scope ? scope.page() : scope

    await scope.getByRole('combobox', { name: label }).click()
    await page.getByRole('option', { name: option, exact: true }).click()
}

export async function balanceOf(page: Page): Promise<number> {
    const response = await page.request.get('/api/wallet')

    expect(response.ok()).toBe(true)

    return ((await response.json()) as { balance: number }).balance
}

/** Deletes every saved squad of the signed-in user so a test starts from an empty list. */
export async function clearSquads(page: Page) {
    const list = await page.request.get('/api/squads')

    for (const squad of (await list.json()) as { id: string }[]) {
        await page.request.delete(`/api/squads/${squad.id}`)
    }
}

export async function openBuilder(page: Page) {
    await page.goto('/builder')
    await page
        .getByRole('button', { name: 'Essential only' })
        .click({ timeout: 2000 })
        .catch(() => undefined)
    await expect(page.getByRole('combobox', { name: 'Formation' })).toBeVisible()
}

/** Picks a player in the open picker: the priciest or (almost) the cheapest one the list shows, always an allowed one. */
export async function pickFromDialog(page: Page, which: 'priciest' | 'cheapest') {
    const dialog = page.getByRole('dialog')

    await expect(dialog).toBeVisible()
    await choose(dialog, 'Sort by', 'Price')

    // Disabled rows say why ("In squad", "Club limit") instead of "Add", so this only sees allowed players.
    const add = dialog.getByRole('button', { name: 'Add', exact: true })

    await (which === 'priciest' ? add.first() : add.last()).click()
    await expect(dialog).toBeHidden()
}

export async function fillSlot(page: Page, slot: string, which: 'priciest' | 'cheapest' = 'cheapest') {
    await page.getByRole('button', { name: slot, exact: true }).first().click()
    await pickFromDialog(page, which)
}

const XI_SLOTS = [
    ...Array<string>(2).fill('Add FWD'),
    ...Array<string>(4).fill('Add MID'),
    ...Array<string>(4).fill('Add DEF'),
    'Add GK',
]

/** Fills the whole squad (4-4-2 and four substitutes) with legal players. */
export async function fillWholeSquad(page: Page, which: 'priciest' | 'cheapest' = 'cheapest') {
    for (const slot of XI_SLOTS) await fillSlot(page, slot, which)

    for (let i = 0; i < 4; i += 1) await fillSlot(page, 'Add Sub', which)
}

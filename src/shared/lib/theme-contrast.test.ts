import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
const block = /\.dark\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
const rootBlock = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''

function colorTokens(source: string): Record<string, string> {
    return Object.fromEntries(
        [...source.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2].toLowerCase()]),
    )
}

function token(name: string): string {
    const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(block)

    if (!match) throw new Error(`token --${name} not found in .dark block`)

    return match[1].toLowerCase()
}

function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255

        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)

    return (hi + 0.05) / (lo + 0.05)
}

describe('dark theme contrast', () => {
    it.each([
        ['foreground', 'background', 4.5],
        ['card-foreground', 'card', 4.5],
        ['muted-foreground', 'background', 4.5],
        ['primary-foreground', 'primary', 4.5],
        ['accent-foreground', 'accent', 4.5],
        ['input', 'background', 3],
        ['input', 'card', 3],
    ])('%s on %s is at least %d:1', (fg, bg, min) => {
        expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(min)
    })

    it(':root colour tokens are identical to the .dark ones', () => {
        expect(colorTokens(rootBlock)).toEqual(colorTokens(block))
    })

    it.each([1, 2, 3, 4, 5])('--chart-%i is at least 3:1 against --card', (n) => {
        expect(contrast(token(`chart-${n}`), token('card'))).toBeGreaterThanOrEqual(3)
    })

    it('has five distinct chart colours', () => {
        expect(new Set([1, 2, 3, 4, 5].map((n) => token(`chart-${n}`))).size).toBe(5)
    })
})

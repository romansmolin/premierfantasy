import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { cellValue, heatShade } from './heatmap-data'

const match = (xgFor: number, pCleanSheet: number) => ({
    opponent: 'Arsenal',
    isHome: true,
    xgFor,
    pCleanSheet,
})

describe('cellValue', () => {
    it('prints expected goals with one decimal', () => {
        expect(cellValue(match(1.94, 0.3), 'xg')).toBe('1.9')
        expect(cellValue(match(0.05, 0.3), 'xg')).toBe('0.1')
    })

    it('prints the clean-sheet chance as a percent with the tail guards', () => {
        expect(cellValue(match(1, 0.31), 'cs')).toBe('31%')
        expect(cellValue(match(1, 0.004), 'cs')).toBe('<1%')
    })
})

type Rgb = [number, number, number]

const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb

const token = (name: string): string => {
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
    const dark = css.slice(css.indexOf('\n.dark {'))

    return new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(dark)![1]
}

const hslToRgb = (h: number, s: number, l: number): Rgb => {
    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))

    return [f(0) * 255, f(8) * 255, f(4) * 255]
}

const luminance = (c: Rgb) => {
    const [r, g, b] = c.map((v) => {
        const s = v / 255

        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a: Rgb, b: Rgb) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)

    return (hi + 0.05) / (lo + 0.05)
}

const parse = (background: string) => {
    const m = /^hsla\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%,\s*(\d*\.?\d+)\)$/.exec(
        background,
    )

    if (!m) throw new Error(`unexpected background ${background}`)

    return { h: +m[1], s: +m[2] / 100, l: +m[3] / 100, alpha: +m[4] }
}

describe('heatShade', () => {
    it('gets stronger as the value grows, for both metrics', () => {
        for (const metric of ['xg', 'cs'] as const) {
            const values = metric === 'xg' ? [0, 0.5, 1, 1.9, 3] : [0, 0.1, 0.31, 0.6, 1]
            const alphas = values.map((v) => parse(heatShade(v, metric).background).alpha)

            expect(alphas.every((a, i) => i === 0 || a > alphas[i - 1])).toBe(true)
        }
    })

    it('clamps values outside the range', () => {
        expect(heatShade(9, 'xg')).toEqual(heatShade(3, 'xg'))
        expect(heatShade(-1, 'cs')).toEqual(heatShade(0, 'cs'))
    })

    it('keeps text readable (>= 4.5:1) at the lowest and the highest shade', () => {
        const text = hex(token('foreground'))
        const card = hex(token('card'))

        for (const [v, metric] of [
            [0, 'xg'],
            [3, 'xg'],
            [0, 'cs'],
            [1, 'cs'],
        ] as const) {
            const { h, s, l, alpha } = parse(heatShade(v, metric).background)
            const tint = hslToRgb(h, s, l)
            const bg = card.map((c, i) => c * (1 - alpha) + tint[i] * alpha) as Rgb

            expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5)
        }
    })
})

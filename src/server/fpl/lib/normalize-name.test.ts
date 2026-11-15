import { describe, expect, it } from 'vitest'

import { normalizeName } from './normalize-name'

describe('normalizeName', () => {
    it('strips accents and special letters', () => {
        expect(normalizeName('Ødegaard')).toBe('odegaard')
        expect(normalizeName("N'Golo Kanté")).toBe('ngolo kante')
        expect(normalizeName('Gabriel Magalhães')).toBe('gabriel magalhaes')
    })

    it('removes dots, turns hyphens into spaces and collapses whitespace', () => {
        expect(normalizeName('D.  Raya')).toBe('d raya')
        expect(normalizeName('Calvert-Lewin')).toBe('calvert lewin')
    })
})

const SPECIAL_LETTERS: Record<string, string> = {
    ø: 'o',
    æ: 'ae',
    œ: 'oe',
    ß: 'ss',
    đ: 'd',
    ł: 'l',
    ı: 'i',
    þ: 'th',
}

/** Lower-case, no accents or punctuation, hyphens as spaces, single spaces: "N'Golo Kanté" → "ngolo kante". */
export function normalizeName(value: string): string {
    return decodeEntities(value)
        .toLowerCase()
        .replace(/[øæœßđłıþ]/g, (letter) => SPECIAL_LETTERS[letter])
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/['’`.]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}

const NAMED_ENTITIES: Record<string, string> = { apos: "'", amp: '&', quot: '"', lt: '<', gt: '>' }

/** API-Football returns some names HTML-escaped ("O&apos;Shea"). */
function decodeEntities(value: string): string {
    return value
        .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
        .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
}

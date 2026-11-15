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
    return value
        .toLowerCase()
        .replace(/[øæœßđłıþ]/g, (letter) => SPECIAL_LETTERS[letter])
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/['’`.]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}

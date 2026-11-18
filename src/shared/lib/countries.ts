// ISO 3166-1 alpha-2 codes of the countries a billing address can be in.
const COUNTRY_CODES =
    'AD AE AF AG AI AL AM AO AR AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CU CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FK FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MK ML MM MN MO MQ MR MS MT MU MV MW MX MY MZ NA NC NE NG NI NL NO NP NR NZ OM PA PE PF PG PH PK PL PM PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WS XK YE YT ZA ZM ZW'.split(
        ' ',
    )

export interface CountryOption {
    value: string
    label: string
}

/** Country options sorted by English name; names come from the platform's Intl data. */
export function getCountryOptions(): CountryOption[] {
    const names = new Intl.DisplayNames(['en'], { type: 'region' })

    return COUNTRY_CODES.map((value) => ({ value, label: names.of(value) ?? value })).sort((a, b) =>
        a.label.localeCompare(b.label, 'en'),
    )
}

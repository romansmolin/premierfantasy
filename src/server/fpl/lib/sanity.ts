import { SuspiciousResponseError } from '@/server/sync/lib/errors'

import type { FplBootstrap } from './fpl.types'

const MIN_ELEMENTS = 400
const TEAM_COUNT = 20
const MIN_EVENTS = 30

const isNumber = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value)

/** FPL is unofficial and can answer with a trimmed or changed payload. Throws before anything is written. */
export function assertSaneBootstrap(data: FplBootstrap): void {
    if (!Array.isArray(data?.elements) || data.elements.length < MIN_ELEMENTS) {
        throw new SuspiciousResponseError(
            `FPL bootstrap has ${data?.elements?.length ?? 0} players, expected at least ${MIN_ELEMENTS}`,
        )
    }

    if (!Array.isArray(data.teams) || data.teams.length !== TEAM_COUNT) {
        throw new SuspiciousResponseError(
            `FPL bootstrap has ${data.teams?.length ?? 0} teams, expected ${TEAM_COUNT}`,
        )
    }

    if (!Array.isArray(data.events) || data.events.length < MIN_EVENTS) {
        throw new SuspiciousResponseError(
            `FPL bootstrap has ${data.events?.length ?? 0} events, expected at least ${MIN_EVENTS}`,
        )
    }

    const settings = data.game_settings

    if (
        !settings ||
        !isNumber(settings.squad_squadsize) ||
        !isNumber(settings.squad_squadplay) ||
        !isNumber(settings.squad_total_spend) ||
        !isNumber(settings.squad_team_limit)
    ) {
        throw new SuspiciousResponseError('FPL bootstrap has missing or malformed game_settings')
    }

    if (!Array.isArray(data.element_types) || data.element_types.length !== 4) {
        throw new SuspiciousResponseError('FPL bootstrap does not have the four position rules')
    }
}

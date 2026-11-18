const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

/** JSON has no dates: turns every ISO timestamp string in a parsed response back into a Date. */
export function reviveDates<T>(value: unknown): T {
    return walk(value) as T
}

function walk(value: unknown): unknown {
    if (typeof value === 'string') return ISO.test(value) ? new Date(value) : value

    if (Array.isArray(value)) return value.map(walk)

    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]))
    }

    return value
}
